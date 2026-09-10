import { useMemo, useEffect } from 'react'

const parser = new DOMParser()

export const useIconIds = (iconSpriteHtml?: string, iconIdPrefix = 'icon-') => {
  const svgSpriteElement = useMemo(() => {
    if (iconSpriteHtml) {
      const doc = parser.parseFromString(iconSpriteHtml, 'text/html')
      const { firstElementChild } = doc.body

      if (
        firstElementChild &&
        firstElementChild.tagName.toLowerCase() === 'svg'
      ) {
        return firstElementChild
      }
    }
  }, [iconSpriteHtml])

  const iconIds = useMemo(() => {
    if (svgSpriteElement) {
      return [...svgSpriteElement.children]
        .filter(
          (element) =>
            element.tagName.toLowerCase() === 'symbol' &&
            element.id?.startsWith(iconIdPrefix),
        )
        .map((element) => element.id.replace(iconIdPrefix, ''))
    }
  }, [svgSpriteElement])

  useEffect(() => {
    if (svgSpriteElement) {
      document.body.appendChild(svgSpriteElement)

      return () => {
        document.body.removeChild(svgSpriteElement)
      }
    }
  }, [svgSpriteElement])

  return iconIds
}
