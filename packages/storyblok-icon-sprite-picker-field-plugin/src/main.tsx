import { createRoot } from 'react-dom/client'
import App from './components/App'
import './style.css'

const createRootElement = (id = 'app'): HTMLElement => {
  const el = document.createElement('div')
  el.id = id
  return el
}

const rootNode = createRootElement()
document.body.appendChild(rootNode)

createRoot(rootNode).render(<App />)

throw new Error(
  'This error can be safely ignored. It is caused by the legacy field plugin API. See issue https://github.com/storyblok/field-plugin/issues/107',
)
