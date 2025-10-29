// Example component showing semantic CSS approach
// This demonstrates how to build components without CSS classes

import { useState } from 'react'

interface ExampleProps {
  title?: string
  onSave?: (data: { name: string; email: string }) => void
  onCancel?: () => void
}

export default function ExampleSemanticComponent({ 
  title = "Example Form", 
  onSave,
  onCancel 
}: ExampleProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [formData, setFormData] = useState({ name: '', email: '' })
  const [isLoading, setIsLoading] = useState(false)
  const [progress, setProgress] = useState(0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    
    // Simulate progress
    for (let i = 0; i <= 100; i += 10) {
      setProgress(i)
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    
    onSave?.(formData)
    setIsLoading(false)
    setIsModalOpen(false)
    setProgress(0)
  }

  return (
    <div className="container" style={{ maxWidth: '32rem' }}>
      {/* Card using semantic article element */}
      <article>
        <h2>{title}</h2>
        <p>This example shows how to build components using semantic HTML elements instead of CSS classes.</p>
        
        {/* Button automatically gets primary styling */}
        <button onClick={() => setIsModalOpen(true)}>
          Open Example Modal
        </button>
      </article>

      {/* Modal using semantic dialog element */}
      {isModalOpen && (
        <dialog open>
          <div>
            {/* Semantic header */}
            <header>
              <h3>User Information</h3>
              <button 
                data-variant="secondary" 
                data-size="sm"
                onClick={() => setIsModalOpen(false)}
                style={{ borderRadius: '50%', width: '2rem', height: '2rem' }}
              >
                ×
              </button>
            </header>

            {/* Semantic main content */}
            <main>
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label htmlFor="name" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
                    Full Name
                  </label>
                  <input
                    id="name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter your full name"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="email" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
                    Email Address
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="Enter your email"
                    required
                  />
                </div>

                {/* Progress bar using semantic progress element */}
                {isLoading && (
                  <div>
                    <p style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                      Processing... {progress}%
                    </p>
                    <progress value={progress} max="100" />
                  </div>
                )}
              </form>
            </main>

            {/* Semantic footer */}
            <footer>
              <button 
                data-variant="secondary"
                type="button"
                onClick={() => setIsModalOpen(false)}
                disabled={isLoading}
              >
                Cancel
              </button>
              <button 
                type="submit"
                onClick={handleSubmit}
                disabled={isLoading || !formData.name || !formData.email}
              >
                {isLoading ? 'Saving...' : 'Save User'}
              </button>
            </footer>
          </div>
        </dialog>
      )}

      {/* Example of different button variants */}
      <article style={{ marginTop: '2rem' }}>
        <h3>Button Variants</h3>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '1rem' }}>
          <button>Primary Button</button>
          <button data-variant="secondary">Secondary Button</button>
          <button data-variant="danger">Delete Button</button>
          <button data-variant="success">Success Button</button>
          <button data-size="sm">Small Button</button>
          <button data-size="lg">Large Button</button>
          <button disabled>Disabled Button</button>
        </div>
      </article>

      {/* Example of form elements */}
      <article style={{ marginTop: '2rem' }}>
        <h3>Form Elements</h3>
        <form style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
          <input type="text" placeholder="Text input" />
          <textarea placeholder="Textarea input" rows={3} />
          <select>
            <option>Select option 1</option>
            <option>Select option 2</option>
            <option>Select option 3</option>
          </select>
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input type="checkbox" />
              Checkbox option
            </label>
          </div>
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input type="radio" name="radio-example" />
              Radio option 1
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input type="radio" name="radio-example" />
              Radio option 2
            </label>
          </div>
        </form>
      </article>

      {/* Example of progress variants */}
      <article style={{ marginTop: '2rem' }}>
        <h3>Progress Bars</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
          <div>
            <p style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>Default Progress (60%)</p>
            <progress value="60" max="100" />
          </div>
          <div>
            <p style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>Success Progress (80%)</p>
            <progress value="80" max="100" data-variant="success" />
          </div>
          <div>
            <p style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>Danger Progress (30%)</p>
            <progress value="30" max="100" data-variant="danger" />
          </div>
        </div>
      </article>
    </div>
  )
}
