'use client'

import { useState, useCallback } from 'react'

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
