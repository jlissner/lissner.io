import { Suspense } from 'react'
import PhotoGrid from '../components/PhotoGrid'
import UploadButton from '../components/UploadButton'

function LoadingSkeleton() {
  return (
    <div data-grid="responsive">
      {[...Array(6)].map((_, i) => (
        <div key={i} data-skeleton></div>
      ))}
    </div>
  )
}

export default function Home() {
  return (
    <div className="container">
      <header data-page>
        <div>
          <h1>Lissner Family Photos</h1>
          <p>Welcome to our family photo collection</p>
        </div>
        <UploadButton />
      </header>
      
      <section data-content>
        <Suspense fallback={<LoadingSkeleton />}>
          <PhotoGrid />
        </Suspense>
      </section>
    </div>
  )
}
