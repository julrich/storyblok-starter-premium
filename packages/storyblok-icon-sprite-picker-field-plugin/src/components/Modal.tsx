import { FunctionComponent } from 'react'
import Icon from './Icon'

const ModalToggle: FunctionComponent<{
  setModalOpen: (isModalOpen: boolean) => void
  setContent: (id: string) => void
  ids: string[]
  currentId?: string
}> = ({ setContent, setModalOpen, ids, currentId }) => {
  return (
    <>
      <button
        type="button"
        className="btn btn-close"
        onClick={() => setModalOpen(false)}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 12 12"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M1.75738 0.343176L0.343166 1.75739L4.58581 6.00003L0.343165 10.2427L1.75738 11.6569L6.00002 7.41424L10.2427 11.6569L11.6569 10.2427L7.41423 6.00003L11.6569 1.75739L10.2427 0.343176L6.00002 4.58582L1.75738 0.343176Z"
            fill="#1B243F"
          />
        </svg>
        <span className="sr-only">Close Modal</span>
      </button>

      <ul className="container">
        {ids.map((iconId) => (
          <button
            key={iconId}
            type="button"
            onClick={() => {
              setContent(iconId)
              setModalOpen(false)
            }}
            title={iconId}
            style={{ margin: 2, padding: 4 }}
            className="btn"
            aria-selected={iconId === currentId}
          >
            <Icon id={iconId} />
          </button>
        ))}
      </ul>
    </>
  )
}

export default ModalToggle
