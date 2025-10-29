'use client'

interface PhotoControlsProps {
  selectionMode: boolean
  isOperationInProgress: boolean
  onSelectionModeToggle: () => void
}

export const PhotoControls = ({
  selectionMode,
  isOperationInProgress,
  onSelectionModeToggle
}: PhotoControlsProps) => {
  return (
    <div data-stack="lg" style={{ marginBottom: '1.5rem' }}>
      {/* Selection Mode Toggle */}
      <div data-flex="between" style={{ 
        borderTop: '1px solid var(--neutral-200)', 
        paddingTop: '1rem' 
      }}>
        <div data-cluster="lg">
          <button
            onClick={onSelectionModeToggle}
            disabled={isOperationInProgress}
            data-variant={selectionMode ? 'danger' : 'secondary'}
            style={{
              padding: '0.5rem 1rem',
              fontSize: '0.875rem',
              fontWeight: 500,
              cursor: isOperationInProgress ? 'not-allowed' : 'pointer',
              opacity: isOperationInProgress ? 0.5 : 1
            }}
          >
            {selectionMode ? '❌ Exit Selection' : '☑️ Select Photos'}
          </button>
        </div>
      </div>
    </div>
  )
} 