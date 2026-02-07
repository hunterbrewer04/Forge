'use client'

import Lightbox from 'yet-another-react-lightbox'
import Video from 'yet-another-react-lightbox/plugins/video'
import Zoom from 'yet-another-react-lightbox/plugins/zoom'
import 'yet-another-react-lightbox/styles.css'
import './media-viewer.css'

// Define slide types
interface ImageSlide {
  type: 'image'
  src: string
  alt?: string
}

interface VideoSlide {
  type: 'video'
  sources: { src: string; type: string }[]
  poster?: string
}

type Slide = ImageSlide | VideoSlide

interface MediaViewerProps {
  isOpen: boolean
  onClose: () => void
  slides: Slide[]
  initialIndex?: number
}

export default function MediaViewer({
  isOpen,
  onClose,
  slides,
  initialIndex = 0
}: MediaViewerProps) {
  return (
    <Lightbox
      open={isOpen}
      close={onClose}
      slides={slides}
      index={initialIndex}
      plugins={[Video, Zoom]}
      video={{
        controls: true,
        playsInline: true,
      }}
      zoom={{
        maxZoomPixelRatio: 3,
        scrollToZoom: true,
      }}
      carousel={{
        finite: slides.length <= 1,
      }}
      styles={{
        container: { backgroundColor: 'rgba(0, 0, 0, 0.95)' },
      }}
      controller={{
        closeOnBackdropClick: true,
      }}
    />
  )
}

