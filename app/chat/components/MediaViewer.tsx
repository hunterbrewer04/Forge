'use client'

import { useState, useCallback } from 'react'
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

// Export helper hook for managing lightbox state
export function useMediaViewer() {
  const [isOpen, setIsOpen] = useState(false)
  const [slides, setSlides] = useState<Slide[]>([])
  const [initialIndex, setInitialIndex] = useState(0)

  const openViewer = useCallback((newSlides: Slide[], index: number = 0) => {
    setSlides(newSlides)
    setInitialIndex(index)
    setIsOpen(true)
  }, [])

  const closeViewer = useCallback(() => {
    setIsOpen(false)
  }, [])

  const openSingleImage = useCallback((src: string, alt?: string) => {
    openViewer([{ type: 'image', src, alt }], 0)
  }, [openViewer])

  const openSingleVideo = useCallback((src: string, mimeType: string = 'video/mp4') => {
    openViewer([{ type: 'video', sources: [{ src, type: mimeType }] }], 0)
  }, [openViewer])

  return {
    isOpen,
    slides,
    initialIndex,
    openViewer,
    closeViewer,
    openSingleImage,
    openSingleVideo,
  }
}
