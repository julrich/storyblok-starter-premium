import { FunctionComponent } from 'react'

const Icon: FunctionComponent<{
  id?: string
  size?: number
}> = ({ id = '', size = 32 }) => {
  return (
    <svg style={{ width: size, height: size }}>
      <use
        xmlnsXlink="http://www.w3.org/1999/xlink"
        xlinkHref={'#icon-' + id}
      />
    </svg>
  )
}

export default Icon
