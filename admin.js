const STORAGE_KEY = 'vg_properties'

function getStored() {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return []
  try {
    return JSON.parse(raw)
  } catch {
    return []
  }
}

function saveStored(items) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
}

function getEmbedMapUrl(link) {
  if (!link) return ''
  const trimmed = link.trim()
  if (!trimmed) return ''
  if (trimmed.includes('/maps/embed')) return trimmed
  return `https://www.google.com/maps?q=${encodeURIComponent(trimmed)}&output=embed`
}

const form = document.getElementById('adminForm')
const msg = document.getElementById('adminMsg')
const list = document.getElementById('adminList')

function renderList() {
  const items = getStored()
  list.innerHTML = ''
  if (!items.length) {
    const p = document.createElement('p')
    p.className = 'empty'
    p.textContent = 'Todavia no hay propiedades cargadas desde admin.'
    list.appendChild(p)
    return
  }

  items.forEach((p) => {
    const card = document.createElement('article')
    card.className = 'card'
    card.innerHTML = `
      <div class="card-body">
        <h3>${p.title}</h3>
        <p class="price">${p.priceLabel}</p>
        <p class="muted">${p.location}</p>
        <div class="meta">
          <span>${p.meters} m2</span>
          <span>${p.rooms} amb.</span>
          <span>${p.bathrooms} banos</span>
        </div>
      </div>
    `

    if (p.mapLink) {
      const iframe = document.createElement('iframe')
      iframe.className = 'map-frame'
      iframe.loading = 'lazy'
      iframe.referrerPolicy = 'no-referrer-when-downgrade'
      iframe.src = getEmbedMapUrl(p.mapLink)
      card.appendChild(iframe)
    }

    list.appendChild(card)
  })
}

form.addEventListener('submit', (e) => {
  e.preventDefault()
  const fd = new FormData(form)

  const photos = String(fd.get('photos') || '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean)

  if (!photos.length) {
    msg.textContent = 'Tenes que cargar al menos una foto.'
    return
  }

  const property = {
    id: Date.now(),
    operation: String(fd.get('operation')),
    title: String(fd.get('title')),
    priceLabel: String(fd.get('priceLabel')),
    priceUsd: Number(fd.get('priceUsd') || 0),
    location: String(fd.get('location')),
    meters: Number(fd.get('meters') || 0),
    rooms: Number(fd.get('rooms') || 0),
    bathrooms: Number(fd.get('bathrooms') || 0),
    extras: String(fd.get('extras') || ''),
    photos,
    mapLink: String(fd.get('mapLink') || '').trim()
  }

  const items = getStored()
  items.unshift(property)
  saveStored(items)

  msg.textContent = 'Propiedad guardada. Ya aparece en index.html con su mapa.'
  form.reset()
  renderList()
})

renderList()
