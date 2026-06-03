const SUPABASE_URL = 'https://kxtbuqgqpgaseiaoclri.supabase.co'
const SUPABASE_KEY = 'sb_publishable_KiAQsHfP0ACCEWhAI2_qZg_Ng2KDSas'
const STATS_KEY = 'vg_stats'
const MAX_PHOTOS = 10
const MAX_IMAGE_SIDE = 1600
const JPEG_QUALITY = 0.82

function waitForSupabase(maxAttempts = 40, delayMs = 150) {
  return new Promise((resolve) => {
    let attempts = 0

    const check = () => {
      if (window.supabase?.createClient) {
        resolve(window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY))
        return
      }

      attempts += 1
      if (attempts >= maxAttempts) {
        resolve(null)
        return
      }

      window.setTimeout(check, delayMs)
    }

    check()
  })
}

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function getStats() {
  const raw = localStorage.getItem(STATS_KEY)
  if (!raw) return {}

  try {
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

function getEmbedMapUrl(link) {
  if (!link) return ''
  const trimmed = String(link).trim()
  if (!trimmed) return ''
  if (trimmed.includes('/maps/embed')) return trimmed
  return `https://www.google.com/maps?q=${encodeURIComponent(trimmed)}&output=embed`
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function resizeImage(dataUrl) {
  return new Promise((resolve) => {
    const image = new Image()
    image.onload = () => {
      const ratio = Math.min(1, MAX_IMAGE_SIDE / Math.max(image.width, image.height))
      const width = Math.max(1, Math.round(image.width * ratio))
      const height = Math.max(1, Math.round(image.height * ratio))
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const context = canvas.getContext('2d')
      context.drawImage(image, 0, 0, width, height)
      resolve(canvas.toDataURL('image/jpeg', JPEG_QUALITY))
    }
    image.onerror = () => resolve(dataUrl)
    image.src = dataUrl
  })
}

function createMenuController(toggleButton, panel) {
  if (!toggleButton || !panel) return { close() {} }

  const close = () => {
    panel.classList.remove('is-open')
    toggleButton.setAttribute('aria-expanded', 'false')
  }

  const open = () => {
    panel.classList.add('is-open')
    toggleButton.setAttribute('aria-expanded', 'true')
  }

  toggleButton.addEventListener('click', (event) => {
    event.preventDefault()
    event.stopPropagation()
    const shouldOpen = !panel.classList.contains('is-open')
    if (shouldOpen) open()
    else close()
  })

  document.addEventListener('click', (event) => {
    if (!panel.classList.contains('is-open')) return
    if (panel.contains(event.target) || toggleButton.contains(event.target)) return
    close()
  })

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') close()
  })

  return { close }
}

function bootAdmin() {
  const form = document.getElementById('adminForm')
  const msg = document.getElementById('adminMsg')
  const list = document.getElementById('adminList')
  const dropZone = document.getElementById('dropZone')
  const fileInput = document.getElementById('fileInput')
  const previewContainer = document.getElementById('previewContainer')
  const sidebarToggle = document.getElementById('sidebarToggle')
  const adminSidebar = document.getElementById('adminSidebar')
  const tabPanes = document.querySelectorAll('.tab-pane')
  const tabTriggers = document.querySelectorAll('[data-tab]')
  const menu = createMenuController(sidebarToggle, adminSidebar)

  window.addEventListener('dragover', (event) => event.preventDefault(), false)
  window.addEventListener('drop', (event) => event.preventDefault(), false)

  let supabase = null
  let chartViewsInstance = null
  let chartDistInstance = null
  let currentPhotos = []
  let dragSourceIndex = null

  function setMessage(text, isError = false) {
    if (!msg) return
    msg.textContent = text
    msg.style.color = isError ? '#b42318' : '#435869'
  }

  function syncTabButtons(activeTabId) {
    tabTriggers.forEach((trigger) => {
      trigger.classList.toggle('active', trigger.getAttribute('data-tab') === activeTabId)
    })

    tabPanes.forEach((pane) => {
      pane.classList.toggle('active', pane.id === activeTabId)
    })
  }

  async function activateTab(tabId) {
    syncTabButtons(tabId)
    menu.close()

    if (tabId === 'tab-dashboard') {
      await initDashboard()
    }
  }

  tabTriggers.forEach((trigger) => {
    trigger.addEventListener('click', async () => {
      const targetTab = trigger.getAttribute('data-tab')
      if (!targetTab) return
      await activateTab(targetTab)
    })
  })

  function bindDropZone() {
    if (!dropZone || !fileInput) return

    dropZone.addEventListener('click', () => fileInput.click())
    dropZone.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        fileInput.click()
      }
    })

    ;['dragenter', 'dragover'].forEach((eventName) => {
      dropZone.addEventListener(eventName, (event) => {
        event.preventDefault()
        event.stopPropagation()
        dropZone.classList.add('dragover')
      })
    })

    ;['dragleave', 'dragend', 'drop'].forEach((eventName) => {
      dropZone.addEventListener(eventName, (event) => {
        event.preventDefault()
        event.stopPropagation()
        if (eventName !== 'drop') {
          dropZone.classList.remove('dragover')
        }
      })
    })

    dropZone.addEventListener('drop', async (event) => {
      dropZone.classList.remove('dragover')
      const files = Array.from(event.dataTransfer?.files || [])
      await handleFiles(files)
    })

    fileInput.addEventListener('change', async (event) => {
      const files = Array.from(event.target.files || [])
      await handleFiles(files)
      event.target.value = ''
    })
  }

  async function handleFiles(files) {
    const incoming = files.filter((file) => file.type.startsWith('image/'))
    if (!incoming.length) {
      setMessage('Selecciona imagenes validas para la propiedad.', true)
      return
    }

    const remainingSlots = MAX_PHOTOS - currentPhotos.length
    if (remainingSlots <= 0) {
      setMessage(`Solo se permiten hasta ${MAX_PHOTOS} fotos por propiedad.`, true)
      return
    }

    const selected = incoming.slice(0, remainingSlots)
    for (const file of selected) {
      const rawDataUrl = await readFileAsDataUrl(file)
      const preview = await resizeImage(rawDataUrl)
      currentPhotos.push({
        id: `img_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        name: file.name,
        preview
      })
    }

    renderPreviews()
    setMessage(`${currentPhotos.length} foto(s) lista(s) para publicar.`)
  }

  function renderPreviews() {
    if (!previewContainer) return

    previewContainer.innerHTML = ''
    currentPhotos.forEach((photo, index) => {
      const item = document.createElement('div')
      item.className = 'preview-item'
      item.draggable = true
      item.dataset.index = String(index)
      item.innerHTML = `
        <img src="${photo.preview}" alt="${escapeHtml(photo.name)}" />
        <button type="button" class="preview-item-remove" aria-label="Quitar foto">x</button>
        <span class="preview-item-order">${index + 1}</span>
      `

      item.addEventListener('dragstart', () => {
        dragSourceIndex = index
        item.classList.add('dragging')
      })

      item.addEventListener('dragover', (event) => {
        event.preventDefault()
      })

      item.addEventListener('drop', (event) => {
        event.preventDefault()
        if (dragSourceIndex === null || dragSourceIndex === index) return
        const moved = currentPhotos.splice(dragSourceIndex, 1)[0]
        currentPhotos.splice(index, 0, moved)
        dragSourceIndex = null
        renderPreviews()
      })

      item.addEventListener('dragend', () => {
        dragSourceIndex = null
        item.classList.remove('dragging')
      })

      item.querySelector('.preview-item-remove')?.addEventListener('click', (event) => {
        event.stopPropagation()
        currentPhotos.splice(index, 1)
        renderPreviews()
      })

      previewContainer.appendChild(item)
    })
  }

  async function renderList() {
    if (!list) return

    if (!supabase) {
      list.innerHTML =
        '<p class="empty">No se pudo conectar con Supabase. Revisa la conexion o el cargado del SDK.</p>'
      return
    }

    list.innerHTML = '<p class="empty">Cargando propiedades...</p>'

    try {
      const { data, error } = await supabase
        .from('propiedades')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      if (!data?.length) {
        list.innerHTML = '<p class="empty">Todavia no hay propiedades cargadas.</p>'
        return
      }

      list.innerHTML = ''

      data.forEach((property) => {
        const cover = Array.isArray(property.photos) && property.photos[0] ? property.photos[0] : ''
        const article = document.createElement('article')
        article.className = 'card'
        article.innerHTML = `
          ${cover ? `<img class="admin-card-cover" src="${cover}" alt="${escapeHtml(property.title)}" />` : ''}
          <div class="card-body">
            <div class="admin-card-header">
              <div>
                ${property.code ? `<span class="ref-code-badge">Ref: #${escapeHtml(property.code)}</span>` : ''}
                <h3>${escapeHtml(property.title)}</h3>
              </div>
              <button class="delete-prop-btn" type="button" data-id="${property.id}">Eliminar</button>
            </div>
            <p class="price">${escapeHtml(property.price_label || 'Consultar precio')}</p>
            <p class="muted">${escapeHtml(property.location || '')}</p>
            <div class="meta">
              <span>${Number(property.meters || 0)} m2</span>
              <span>${Number(property.rooms || 0)} amb.</span>
              <span>${Number(property.bathrooms || 0)} banos</span>
            </div>
          </div>
        `

        article.querySelector('.delete-prop-btn')?.addEventListener('click', async () => {
          if (!window.confirm(`Vas a eliminar "${property.title}". Queres seguir?`)) return

          const { error: deleteError } = await supabase
            .from('propiedades')
            .delete()
            .eq('id', property.id)

          if (deleteError) {
            alert(`No se pudo borrar la propiedad: ${deleteError.message}`)
            return
          }

          await renderList()
          if (document.getElementById('tab-dashboard')?.classList.contains('active')) {
            await initDashboard()
          }
        })

        if (property.map_link) {
          const iframe = document.createElement('iframe')
          iframe.className = 'map-frame'
          iframe.loading = 'lazy'
          iframe.referrerPolicy = 'no-referrer-when-downgrade'
          iframe.src = getEmbedMapUrl(property.map_link)
          article.appendChild(iframe)
        }

        list.appendChild(article)
      })
    } catch (error) {
      console.error('Error listando propiedades:', error)
      list.innerHTML = `<p class="empty">Error al traer propiedades: ${escapeHtml(error.message)}</p>`
    }
  }

  if (form) {
    form.addEventListener('submit', async (event) => {
      event.preventDefault()

      if (!supabase) {
        setMessage('No hay conexion con Supabase.', true)
        return
      }

      if (!currentPhotos.length) {
        setMessage('Carga al menos una foto antes de guardar.', true)
        return
      }

      const formData = new FormData(form)
      const rawCode = String(formData.get('code') || '').trim()
      const property = {
        code: rawCode || `REF-${Math.floor(1000 + Math.random() * 9000)}`,
        operation: String(formData.get('operation') || 'venta'),
        title: String(formData.get('title') || '').trim(),
        price_label: String(formData.get('priceLabel') || '').trim(),
        price_usd: Number(formData.get('priceUsd') || 0),
        location: String(formData.get('location') || '').trim(),
        meters: Number(formData.get('meters') || 0),
        rooms: Number(formData.get('rooms') || 0),
        bathrooms: Number(formData.get('bathrooms') || 0),
        extras: String(formData.get('extras') || '').trim(),
        photos: currentPhotos.map((photo) => photo.preview),
        map_link: String(formData.get('mapLink') || '').trim()
      }

      if (!property.title || !property.price_label || !property.location) {
        setMessage('Completa titulo, precio visible y ubicacion.', true)
        return
      }

      setMessage('Guardando propiedad...')

      try {
        const { error } = await supabase.from('propiedades').insert([property])
        if (error) throw error

        form.reset()
        currentPhotos = []
        renderPreviews()
        setMessage('Propiedad guardada con exito.')
        await renderList()
      } catch (error) {
        console.error('Error guardando propiedad:', error)
        setMessage(`Error al guardar: ${error.message}`, true)
      }
    })
  }

  async function initDashboard() {
    const tbody = document.getElementById('statsTableBody')
    if (!tbody) return

    tbody.innerHTML = '<tr><td colspan="6" class="muted" style="text-align:center;">Cargando metricas...</td></tr>'

    if (!supabase) {
      tbody.innerHTML =
        '<tr><td colspan="6" class="muted" style="text-align:center; color:#b42318;">No se pudo conectar con Supabase.</td></tr>'
      return
    }

    try {
      const { data, error } = await supabase
        .from('propiedades')
        .select('*')
        .order('views', { ascending: false })

      if (error) throw error

      const dbProperties = (data || []).map((property) => ({
        id: Number(property.id),
        title: property.title || 'Propiedad',
        operation: property.operation || 'venta',
        priceLabel: property.price_label || 'Consultar',
        views: Number(property.views || 0),
        clicks: Number(property.clicks || 0)
      }))

      const localStats = getStats()
      const baseProperties = []
      const localProperties = baseProperties.map((property) => {
        const stats = localStats[property.id] || { views: 0, clicks: 0 }
        return {
          id: property.id,
          title: property.title,
          operation: property.operation,
          priceLabel: property.priceLabel,
          views: Number(stats.views || 0),
          clicks: Number(stats.clicks || 0)
        }
      })

      const properties = [...localProperties, ...dbProperties].sort((a, b) => b.views - a.views)
      const totalViews = properties.reduce((sum, property) => sum + property.views, 0)
      const totalClicks = properties.reduce((sum, property) => sum + property.clicks, 0)
      const conversionRate = totalViews ? ((totalClicks / totalViews) * 100).toFixed(1) : '0.0'

      document.getElementById('kpiTotalViews').textContent = totalViews.toLocaleString()
      document.getElementById('kpiTotalClicks').textContent = totalClicks.toLocaleString()
      document.getElementById('kpiConversionRate').textContent = `${conversionRate}%`

      if (!properties.length) {
        tbody.innerHTML =
          '<tr><td colspan="6" class="muted" style="text-align:center;">Todavia no hay propiedades para analizar.</td></tr>'
      } else {
        tbody.innerHTML = properties
          .map((property) => {
            const rate = property.views ? ((property.clicks / property.views) * 100).toFixed(1) : '0.0'
            const badge =
              property.operation === 'venta'
                ? '<span class="op-badge op-sale">VENTA</span>'
                : '<span class="op-badge op-rent">ALQUILER</span>'

            return `
              <tr>
                <td style="text-align:left; font-weight:700;">${escapeHtml(property.title)}</td>
                <td>${badge}</td>
                <td>${escapeHtml(property.priceLabel)}</td>
                <td>${property.views.toLocaleString()}</td>
                <td>${property.clicks.toLocaleString()}</td>
                <td style="font-weight:700; color:#b89052;">${rate}%</td>
              </tr>
            `
          })
          .join('')
      }

      if (!window.Chart) return

      const topProperties = properties.slice(0, 10)
      const labels = topProperties.map((property) =>
        property.title.length > 22 ? `${property.title.slice(0, 19)}...` : property.title
      )
      const viewsData = topProperties.map((property) => property.views)
      const clicksData = topProperties.map((property) => property.clicks)
      const saleCount = properties.filter((property) => property.operation === 'venta').length
      const rentCount = properties.filter((property) => property.operation === 'alquiler').length

      const viewsCanvas = document.getElementById('chartViews')
      const distCanvas = document.getElementById('chartDistribution')
      if (!viewsCanvas || !distCanvas) return

      if (chartViewsInstance) chartViewsInstance.destroy()
      if (chartDistInstance) chartDistInstance.destroy()

      chartViewsInstance = new Chart(viewsCanvas.getContext('2d'), {
        type: 'bar',
        data: {
          labels,
          datasets: [
            {
              label: 'Visitas',
              data: viewsData,
              backgroundColor: '#17344a',
              borderRadius: 10
            },
            {
              label: 'Clicks',
              data: clicksData,
              backgroundColor: '#b89052',
              borderRadius: 10
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              labels: {
                font: { family: 'Plus Jakarta Sans' }
              }
            }
          },
          scales: {
            y: { beginAtZero: true },
            x: { grid: { display: false } }
          }
        }
      })

      chartDistInstance = new Chart(distCanvas.getContext('2d'), {
        type: 'doughnut',
        data: {
          labels: ['Venta', 'Alquiler'],
          datasets: [
            {
              data: [saleCount, rentCount],
              backgroundColor: ['#17344a', '#b89052']
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                font: { family: 'Plus Jakarta Sans' }
              }
            }
          }
        }
      })
    } catch (error) {
      console.error('Error cargando dashboard:', error)
      tbody.innerHTML =
        `<tr><td colspan="6" class="muted" style="text-align:center; color:#b42318;">${escapeHtml(error.message)}</td></tr>`
    }
  }

  async function init() {
    bindDropZone()
    supabase = await waitForSupabase()
    if (!supabase) {
      setMessage('No se pudo cargar Supabase en el panel.', true)
    }

    await activateTab('tab-upload')
    await renderList()
  }

  init()
}

bootAdmin()
