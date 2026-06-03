const SUPABASE_URL = 'https://kxtbuqgqpgaseiaoclri.supabase.co'
const SUPABASE_KEY = 'sb_publishable_KiAQsHfP0ACCEWhAI2_qZg_Ng2KDSas'
const STATS_KEY = 'vg_stats' // Para leer las visitas locales de las propiedades base

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY)

// Sin propiedades demo: solo se muestran las propiedades reales de Supabase
const baseProperties = []

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
  const trimmed = link.trim()
  if (!trimmed) return ''
  if (trimmed.includes('/maps/embed')) return trimmed
  return `https://www.google.com/maps?q=${encodeURIComponent(trimmed)}&output=embed`
}

// Selectores de la UI
const form = document.getElementById('adminForm')
const msg = document.getElementById('adminMsg')
const list = document.getElementById('adminList')
const dropZone = document.getElementById('dropZone')
const fileInput = document.getElementById('fileInput')
const previewContainer = document.getElementById('previewContainer')

let currentPhotos = [] // { id, file, preview }

// Eventos de carga de archivos (Uploader UI)
if (dropZone) {
  dropZone.addEventListener('click', () => fileInput.click())

  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault()
    dropZone.classList.add('dragover')
  })

  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover')
  })

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault()
    dropZone.classList.remove('dragover')
    if (e.dataTransfer.files) {
      handleFiles(e.dataTransfer.files)
    }
  })
}

if (fileInput) {
  fileInput.addEventListener('change', (e) => {
    if (e.target.files) {
      handleFiles(e.target.files)
    }
  })
}

function handleFiles(files) {
  Array.from(files).forEach((file) => {
    if (!file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = (event) => {
      const id = 'img_' + Math.random().toString(36).substr(2, 9)
      currentPhotos.push({
        id,
        file,
        preview: event.target.result
      })
      renderPreviews()
    }
    reader.readAsDataURL(file)
  })
}

function renderPreviews() {
  if (!previewContainer) return
  previewContainer.innerHTML = ''
  currentPhotos.forEach((photo, index) => {
    const item = document.createElement('div')
    item.className = 'preview-item'
    item.draggable = true
    item.dataset.id = photo.id
    item.dataset.index = index

    const img = document.createElement('img')
    img.src = photo.preview
    img.alt = 'Preview'

    const removeBtn = document.createElement('button')
    removeBtn.type = 'button'
    removeBtn.className = 'preview-item-remove'
    removeBtn.innerHTML = '×'
    removeBtn.addEventListener('click', (e) => {
      e.stopPropagation()
      currentPhotos = currentPhotos.filter((p) => p.id !== photo.id)
      renderPreviews()
    })

    item.appendChild(img)
    item.appendChild(removeBtn)

    item.addEventListener('dragstart', handleDragStart)
    item.addEventListener('dragover', handleDragOver)
    item.addEventListener('drop', handleDrop)
    item.addEventListener('dragend', handleDragEnd)

    previewContainer.appendChild(item)
  })
}

let dragSrcEl = null

function handleDragStart(e) {
  this.classList.add('dragging')
  dragSrcEl = this
  e.dataTransfer.effectAllowed = 'move'
  e.dataTransfer.setData('text/plain', this.dataset.index)
}

function handleDragOver(e) {
  e.preventDefault()
  e.dataTransfer.dropEffect = 'move'
  return false
}

function handleDrop(e) {
  e.stopPropagation()
  e.preventDefault()

  if (dragSrcEl !== this) {
    const fromIndex = parseInt(dragSrcEl.dataset.index)
    const toIndex = parseInt(this.dataset.index)

    const movedItem = currentPhotos.splice(fromIndex, 1)[0]
    currentPhotos.splice(toIndex, 0, movedItem)

    renderPreviews()
  }
  return false
}

function handleDragEnd() {
  this.classList.remove('dragging')
  const items = previewContainer.querySelectorAll('.preview-item')
  items.forEach((item) => item.classList.remove('dragging'))
}

async function renderList() {
  if (!list) return
  list.innerHTML = '<p class="muted">Cargando propiedades de Supabase...</p>'
  
  try {
    const { data, error } = await supabase
      .from('propiedades')
      .select('*')
      .order('created_at', { ascending: false })
      
    if (error) throw error
    
    list.innerHTML = ''
    if (!data.length) {
      const p = document.createElement('p')
      p.className = 'empty'
      p.textContent = 'Todavia no hay propiedades cargadas en Supabase.'
      list.appendChild(p)
      return
    }

    data.forEach((p) => {
      const card = document.createElement('article')
      card.className = 'card'
      card.innerHTML = `
        <div class="card-body">
          <div style="display: flex; justify-content: space-between; align-items: start;">
            <div>
              ${p.code ? `<span style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: #b89052; letter-spacing: 0.05em; display: block; margin-bottom: 4px;">Ref: #${p.code}</span>` : ''}
              <h3>${p.title}</h3>
            </div>
            <button class="delete-prop-btn" data-id="${p.id}" style="background: rgba(220,53,69,0.1); color:#dc3545; border:none; border-radius:6px; padding:6px 12px; font-weight:700; cursor:pointer; font-size:12px;">Eliminar</button>
          </div>
          <p class="price">${p.price_label}</p>
          <p class="muted">${p.location}</p>
          <div class="meta">
            <span>${p.meters} m2</span>
            <span>${p.rooms} amb.</span>
            <span>${p.bathrooms} banos</span>
          </div>
        </div>
      `
      
      const deleteBtn = card.querySelector('.delete-prop-btn')
      deleteBtn.addEventListener('click', async (e) => {
        e.stopPropagation()
        if (confirm(`¿Seguro que querés eliminar la propiedad "${p.title}" de forma permanente?`)) {
          deleteBtn.disabled = true
          deleteBtn.textContent = 'Borrando...'
          
          const { error: delError } = await supabase
            .from('propiedades')
            .delete()
            .eq('id', p.id)
            
          if (delError) {
            alert('Error al borrar: ' + delError.message)
            deleteBtn.disabled = false
            deleteBtn.textContent = 'Eliminar'
          } else {
            // Recargar listados y dashboard
            renderList()
            const activeTab = document.querySelector('.sidebar-link.active')?.getAttribute('data-tab')
            if (activeTab === 'tab-dashboard') {
              initDashboard()
            }
          }
        }
      })

      if (p.map_link) {
        const iframe = document.createElement('iframe')
        iframe.className = 'map-frame'
        iframe.loading = 'lazy'
        iframe.referrerPolicy = 'no-referrer-when-downgrade'
        iframe.src = getEmbedMapUrl(p.map_link)
        card.appendChild(iframe)
      }

      list.appendChild(card)
    })
  } catch (err) {
    console.error('Error fetching list from DB:', err)
    list.innerHTML = `<p class="muted" style="color:#dc3545; padding: 14px; border: 1px dashed #dc3545; border-radius:10px;">Error al conectar con Supabase: ${err.message}</p>`
  }
}

if (form) {
  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    
    if (!currentPhotos.length) {
      msg.textContent = 'Tenes que cargar al menos una foto.'
      return
    }

    msg.textContent = 'Subiendo fotos al Storage de Supabase...'
    const uploadedUrls = []

    try {
      for (const photo of currentPhotos) {
        const ext = photo.file.name.split('.').pop() || 'jpg'
        const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${ext}`

        const { data, error } = await supabase.storage
          .from('Verito Garga Inmobiliaria')
          .upload(`propiedades/${fileName}`, photo.file, {
            cacheControl: '3600',
            upsert: false
          })

        if (error) throw error

        const { data: urlData } = supabase.storage
          .from('Verito Garga Inmobiliaria')
          .getPublicUrl(`propiedades/${fileName}`)

        uploadedUrls.push(urlData.publicUrl)
      }

      msg.textContent = 'Guardando ficha de propiedad en la base de datos...'
      const fd = new FormData(form)
      const rawCode = String(fd.get('code') || '').trim()
      const autoCode = rawCode || `REF-${Math.floor(1000 + Math.random() * 9000)}`
      const property = {
        code: autoCode,
        operation: String(fd.get('operation')),
        title: String(fd.get('title')),
        price_label: String(fd.get('priceLabel')),
        price_usd: Number(fd.get('priceUsd') || 0),
        location: String(fd.get('location')),
        meters: Number(fd.get('meters') || 0),
        rooms: Number(fd.get('rooms') || 0),
        bathrooms: Number(fd.get('bathrooms') || 0),
        extras: String(fd.get('extras') || ''),
        photos: uploadedUrls,
        map_link: String(fd.get('mapLink') || '').trim()
      }

      const { error: dbError } = await supabase
        .from('propiedades')
        .insert([property])

      if (dbError) throw dbError

      msg.textContent = '¡Propiedad publicada con éxito!'
      form.reset()
      currentPhotos = []
      renderPreviews()
      renderList()

    } catch (err) {
      console.error('Error in upload process:', err)
      msg.textContent = `Error al guardar: ${err.message}. Asegurate de tener creado el bucket "fotos" público y las políticas RLS habilitadas.`
    }
  })
}

// ==========================================================================
// SECCIÓN SIDEBAR & TABS NAVIGATION
// ==========================================================================
const sidebarToggle = document.getElementById('sidebarToggle')
const adminSidebar = document.getElementById('adminSidebar')
const sidebarLinks = document.querySelectorAll('.sidebar-link')
const tabPanes = document.querySelectorAll('.tab-pane')

if (sidebarToggle && adminSidebar) {
  sidebarToggle.addEventListener('click', (e) => {
    e.stopPropagation()
    const open = adminSidebar.classList.toggle('is-open')
    sidebarToggle.setAttribute('aria-expanded', open ? 'true' : 'false')
  })

  document.addEventListener('click', (e) => {
    if (adminSidebar.classList.contains('is-open') && !adminSidebar.contains(e.target) && e.target !== sidebarToggle) {
      adminSidebar.classList.remove('is-open')
      sidebarToggle.setAttribute('aria-expanded', 'false')
    }
  })
}

sidebarLinks.forEach((link) => {
  link.addEventListener('click', () => {
    const targetTab = link.getAttribute('data-tab')
    if (!targetTab) return 

    sidebarLinks.forEach((l) => l.classList.remove('active'))
    link.classList.add('active')

    tabPanes.forEach((pane) => {
      if (pane.id === targetTab) {
        pane.classList.add('active')
      } else {
        pane.classList.remove('active')
      }
    })

    if (targetTab === 'tab-dashboard') {
      initDashboard()
    }

    if (adminSidebar) {
      adminSidebar.classList.remove('is-open')
      if (sidebarToggle) sidebarToggle.setAttribute('aria-expanded', 'false')
    }
  })
})

// ==========================================================================
// SECCIÓN DASHBOARD, GRÁFICOS Y ESTADÍSTICAS
// ==========================================================================
let chartViewsInstance = null
let chartDistInstance = null

async function initDashboard() {
  const tbody = document.getElementById('statsTableBody')
  tbody.innerHTML = '<tr><td colspan="6" class="muted" style="text-align: center;">Cargando métricas...</td></tr>'

  try {
    const { data: dbProperties, error } = await supabase
      .from('propiedades')
      .select('*')
      .order('views', { ascending: false })

    if (error) throw error

    // Obtener estadísticas de localStorage para propiedades base locales
    const localStats = getStats()
    const mappedBase = baseProperties.map((p) => {
      const pStats = localStats[p.id] || { views: 0, clicks: 0 }
      return {
        id: p.id,
        title: p.title,
        operation: p.operation,
        priceLabel: p.priceLabel,
        views: Number(pStats.views || 0),
        clicks: Number(pStats.clicks || 0)
      }
    })

    // Mapear las de la base de datos
    const mappedDb = (dbProperties || []).map((p) => ({
      id: Number(p.id),
      title: p.title,
      operation: p.operation,
      priceLabel: p.price_label,
      views: Number(p.views || 0),
      clicks: Number(p.clicks || 0)
    }))

    const allProperties = [...mappedBase, ...mappedDb].sort((a, b) => b.views - a.views)

    // Calcular KPIs
    let totalViews = 0
    let totalClicks = 0

    allProperties.forEach((p) => {
      totalViews += p.views
      totalClicks += p.clicks
    })

    const convRate = totalViews > 0 ? ((totalClicks / totalViews) * 100).toFixed(1) : '0'

    document.getElementById('kpiTotalViews').textContent = totalViews.toLocaleString()
    document.getElementById('kpiTotalClicks').textContent = totalClicks.toLocaleString()
    document.getElementById('kpiConversionRate').textContent = `${convRate}%`

    tbody.innerHTML = ''
    if (!allProperties.length) {
      tbody.innerHTML = `<tr><td colspan="6" class="muted" style="text-align: center;">No hay propiedades registradas.</td></tr>`
    } else {
      allProperties.forEach((p) => {
        const rate = p.views > 0 ? ((p.clicks / p.views) * 100).toFixed(1) : '0'
        const opBadge = p.operation === 'venta' 
          ? `<span style="background: #eef8f2; color: #0f7b43; font-weight:700; padding: 4px 8px; border-radius:6px; font-size:11px;">VENTA</span>`
          : `<span style="background: #eef4fb; color: #17344a; font-weight:700; padding: 4px 8px; border-radius:6px; font-size:11px;">ALQUILER</span>`

        const tr = document.createElement('tr')
        tr.innerHTML = `
          <td style="text-align: left; font-weight: 700;">${p.title}</td>
          <td>${opBadge}</td>
          <td style="color: var(--muted);">${p.priceLabel}</td>
          <td style="font-weight: 700;">${p.views.toLocaleString()}</td>
          <td>${p.clicks.toLocaleString()}</td>
          <td style="font-weight: 700; color: #b89052;">${rate}%</td>
        `
        tbody.appendChild(tr)
      })
    }

    // Preparar gráficos
    const labels = allProperties.slice(0, 10).map((p) => {
      return p.title.length > 20 ? p.title.substring(0, 18) + '...' : p.title
    })
    const viewsData = allProperties.slice(0, 10).map((p) => p.views)
    const clicksData = allProperties.slice(0, 10).map((p) => p.clicks)

    const countVentas = allProperties.filter((p) => p.operation === 'venta').length
    const countAlquileres = allProperties.filter((p) => p.operation === 'alquiler').length

    // Aumentar el timeout a 400ms para que el DOM en móvil tenga tiempo
    // de renderizar el tab antes de que Chart.js calcule dimensiones.
    setTimeout(() => {
      const ctxViews = document.getElementById('chartViews').getContext('2d')
      if (chartViewsInstance) {
        chartViewsInstance.destroy()
      }

      chartViewsInstance = new Chart(ctxViews, {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [
            {
              label: 'Visitas',
              data: viewsData,
              backgroundColor: '#17344a',
              borderColor: '#17344a',
              borderWidth: 1,
              borderRadius: 4
            },
            {
              label: 'Interacciones',
              data: clicksData,
              backgroundColor: '#b89052',
              borderColor: '#b89052',
              borderWidth: 1,
              borderRadius: 4
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true,
              grid: {
                color: '#eee'
              }
            },
            x: {
              grid: {
                display: false
              }
            }
          },
          plugins: {
            legend: {
              position: 'top',
              labels: {
                font: {
                  family: 'Manrope'
                }
              }
            }
          }
        }
      })

      const ctxDist = document.getElementById('chartDistribution').getContext('2d')
      if (chartDistInstance) {
        chartDistInstance.destroy()
      }

      chartDistInstance = new Chart(ctxDist, {
        type: 'doughnut',
        data: {
          labels: ['Venta', 'Alquiler'],
          datasets: [
            {
              data: [countVentas, countAlquileres],
              backgroundColor: ['#17344a', '#b89052'],
              hoverOffset: 4
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
                font: {
                  family: 'Manrope'
                }
              }
            }
          }
        }
      })
    }, 400)

  } catch (err) {
    console.error('Error rendering dashboard:', err)
    tbody.innerHTML = `<tr><td colspan="6" class="muted" style="text-align: center; color:#dc3545;">Error al cargar dashboard: ${err.message}</td></tr>`
  }
}

// Inicialización de listado en pestaña de carga al entrar
renderList()
