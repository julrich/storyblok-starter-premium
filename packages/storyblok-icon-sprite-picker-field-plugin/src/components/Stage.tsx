import { FunctionComponent } from 'react'
import Icon from './Icon'

const Stage: FunctionComponent<{
  setModalOpen: (isModalOpen: boolean) => void
  setContent: (id?: string) => void
  currentId?: string
}> = ({ setModalOpen, setContent, currentId }) => {
  return (
    <div className="container">
      <span className="selected-wrapper">
        <button
          type="button"
          className="btn"
          onClick={() => setModalOpen(true)}
        >
          {currentId ? (
            <Icon
              id={currentId}
              size={48}
            />
          ) : (
            <span>click here to select an icon</span>
          )}
        </button>

        {currentId && (
          <button
            type="button"
            className="btn btn-clear"
            onClick={() => setContent(undefined)}
            title="Clear Icon"
          >
            🗑️
            <span className="sr-only">Clear Icon</span>
          </button>
        )}
      </span>
      <br />
      <span>{currentId}</span>
    </div>
  )
}

export default Stage
