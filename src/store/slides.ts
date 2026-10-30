import { validCanvasSize } from '@/utils/canvasSize'
import { defaultHeaderFooter, normalizeHeaderFooter, headerFooterElements } from '@/utils/headerFooter'
import type { HeaderFooterSettings } from '@/types/slides'
import { nanoid } from 'nanoid'
import { resolveSlide, findLayout, placeholderSources, instantiatePlaceholder, inheritPlaceholder, createDefaultMaster, clone } from '@/utils/masters'
import type { SlideMaster, SlideLayout } from '@/types/slides'
import { sanitizeData, sanitizeSlides } from '@/utils/security'
import { defineStore } from 'pinia'
import { omit } from 'lodash'
import type { Slide, SlideTheme, PPTElement, PPTAnimation } from '@/types/slides'

interface RemovePropData {
  id: string
  propName: string | string[]
}

interface UpdateElementData {
  id: string | string[]
  props: Partial<PPTElement>
  slideId?: string
}

interface FormatedAnimation {
  animations: PPTAnimation[]
  autoNext: boolean
}

export interface SlidesState {
  headerFooter: HeaderFooterSettings
  masters: SlideMaster[]
  masterEditingId: string
  title: string
  theme: SlideTheme
  slides: Slide[]
  slideIndex: number
  viewportSize: number
  viewportRatio: number
}

export const useSlidesStore = defineStore('slides', {
  state: (): SlidesState => ({
    headerFooter: defaultHeaderFooter(),
    masters: [],
    masterEditingId: '',
    title: '未命名演示文稿', // 幻灯片标题
    theme: {
      themeColors: ['#5b9bd5', '#ed7d31', '#a5a5a5', '#ffc000', '#4472c4', '#70ad47'],
      fontColor: '#333',
      fontName: '',
      backgroundColor: '#fff',
      shadow: {
        h: 3,
        v: 3,
        blur: 2,
        color: '#808080',
      },
      outline: {
        width: 2,
        color: '#525252',
        style: 'solid',
      },
    }, // 主题样式
    slides: [], // 幻灯片页面数据
    slideIndex: 0, // 当前页面索引
    viewportSize: 1000, // 可视区域宽度基数
    viewportRatio: 0.5625, // 可视区域比例，默认16:9
  }),

  getters: {
    currentSlide(state) {
      if (state.masterEditingId) {
        for (const master of state.masters) {
          if (master.id === state.masterEditingId) return master
          const layout = master.layouts.find(item => item.id === state.masterEditingId)
          if (layout) return layout
        }
      }
      return state.slides[state.slideIndex]
    },
  
    currentSlideAnimations(state) {
      const currentSlide = state.slides[state.slideIndex]
      if (!currentSlide?.animations) return []

      const els = currentSlide.elements
      const elIds = els.map(el => el.id)
      return currentSlide.animations.filter(animation => elIds.includes(animation.elId))
    },

    // 格式化的当前页动画
    // 将触发条件为“与上一动画同时”的项目向上合并到序列中的同一位置
    // 为触发条件为“上一动画之后”项目的上一项添加自动向下执行标记
    formatedAnimations(state) {
      const currentSlide = state.slides[state.slideIndex]
      if (!currentSlide?.animations) return []

      const els = currentSlide.elements
      const elIds = els.map(el => el.id)
      const animations = currentSlide.animations.filter(animation => elIds.includes(animation.elId))

      const formatedAnimations: FormatedAnimation[] = []
      for (const animation of animations) {
        if (animation.trigger === 'click' || !formatedAnimations.length) {
          formatedAnimations.push({ animations: [animation], autoNext: false })
        }
        else if (animation.trigger === 'meantime') {
          const last = formatedAnimations[formatedAnimations.length - 1]
          last.animations = last.animations.filter(item => item.elId !== animation.elId)
          last.animations.push(animation)
          formatedAnimations[formatedAnimations.length - 1] = last
        }
        else if (animation.trigger === 'auto') {
          const last = formatedAnimations[formatedAnimations.length - 1]
          last.autoNext = true
          formatedAnimations[formatedAnimations.length - 1] = last
          formatedAnimations.push({ animations: [animation], autoNext: false })
        }
      }
      return formatedAnimations
    },
  },

  actions: {
    resolveSlide(slide: Slide): Slide {
      const resolved = resolveSlide(slide, this.masters)
      const index = this.slides.findIndex(item => item.id === slide.id)
      const fields = headerFooterElements(slide, this.headerFooter, index, this.slides.length, this.viewportSize, this.viewportSize * this.viewportRatio)
      return { ...resolved, elements: [...fields, ...resolved.elements] }
    },
    setHeaderFooter(value: Partial<HeaderFooterSettings>) { this.headerFooter = normalizeHeaderFooter(value) },
    applyHeaderFooter(value: HeaderFooterSettings, all = true) {
      const settings = normalizeHeaderFooter(value)
      if (all) {
        this.headerFooter = settings
        for (const slide of this.slides) delete slide.headerFooter
      }
      else {
        const slide = this.slides[this.slideIndex]
        if (slide) slide.headerFooter = settings
      }
    },
    setMasters(masters: SlideMaster[]) {
      if (!Array.isArray(masters) || masters.some(master => !master || typeof master.id !== 'string' || !Array.isArray(master.elements) || !Array.isArray(master.layouts) || master.layouts.some(layout => !layout || typeof layout.id !== 'string' || !Array.isArray(layout.elements)))) throw new Error('母版数据格式无效')
      this.masters = sanitizeData(masters)
      if (this.masterEditingId && !this.masters.some(m => m.id === this.masterEditingId || m.layouts.some(l => l.id === this.masterEditingId))) this.masterEditingId = ''
      this.syncMasterPlaceholders()
    },
    ensureMasters() {
      if (!this.masters.length) this.masters.push(createDefaultMaster(() => nanoid(10), this.viewportSize, this.viewportSize * this.viewportRatio))
    },
    syncMasterPlaceholders() {
      for (const master of this.masters) {
        for (const layout of master.layouts) {
          if (layout.hideMasterPlaceholders) continue
          const sources = master.elements.filter(el => el.placeholderKey && !layout.suppressedPlaceholderKeys?.includes(el.placeholderKey))
          layout.elements = layout.elements.map(el => {
            const source = sources.find(item => item.placeholderKey === el.placeholderKey)
            return source ? inheritPlaceholder(el, source) : el
          })
          for (const source of sources) if (!layout.elements.some(el => el.placeholderKey === source.placeholderKey)) {
            const inherited = clone(source); inherited.id = nanoid(10); inherited.placeholderDefaults = clone(source) as unknown as Record<string, unknown>
            layout.elements.push(inherited)
          }
        }
      }
      for (const slide of this.slides) {
        const found = findLayout(this.masters, slide.layoutId)
        if (!found) continue
        const sources = placeholderSources(found.master, found.layout)
        slide.elements = slide.elements.map(el => {
          if (!el.placeholderKey) return el
          const source = sources.find(item => item.placeholderKey === el.placeholderKey)
          if (source) return inheritPlaceholder(el, source)
          const detached = { ...el }; delete detached.placeholderKey; delete detached.placeholderDefaults; return detached
        })
        for (const source of sources) if (!slide.elements.some(el => el.placeholderKey === source.placeholderKey)) slide.elements.push(instantiatePlaceholder(source, nanoid(10)))
      }
    },
    applyLayout(layoutId: string, all = false) {
      const found = findLayout(this.masters, layoutId)
      if (!found) return
      for (const slide of all ? this.slides : [this.slides[this.slideIndex]]) {
        if (!slide) continue
        // Match by slot order as well as key so switching layout retains existing content.
        const old = slide.elements.filter(el => el.placeholderKey)
        slide.elements = slide.elements.filter(el => !el.placeholderKey)
        const used = new Set<string>()
        placeholderSources(found.master, found.layout).forEach((source) => {
          const next = instantiatePlaceholder(source, nanoid(10))
          const previous = old.find(el => !used.has(el.id) && el.placeholderKey === source.placeholderKey) || old.find(el => !used.has(el.id))
          if (previous) used.add(previous.id)
          if (next.type === 'text' && previous?.type === 'text') next.content = previous.content
          slide.elements.push(next)
        })
        // Keep unmatched populated placeholders as ordinary elements instead of losing user content.
        old.filter(el => !used.has(el.id)).forEach(el => {
          const next = { ...el }; delete next.placeholderKey; delete next.placeholderDefaults; slide.elements.push(next)
        })
        slide.layoutId = layoutId; slide.masterId = found.master.id; delete slide.background
      }
    },
    resetLayout() {
      const slide = this.slides[this.slideIndex]
      const found = findLayout(this.masters, slide?.layoutId)
      if (!found) return
      for (const el of slide.elements) {
        const source = placeholderSources(found.master, found.layout).find(item => item.placeholderKey === el.placeholderKey)
        if (!source) continue
        const next = instantiatePlaceholder(source, el.id)
        if (next.type === 'text' && el.type === 'text') next.content = el.content
        Object.assign(el, next)
      }
      delete slide.background
    },
    removeMasterItem(id: string) {
      for (const slide of this.slides) {
        if (slide.masterId === id || slide.layoutId === id) {
          Object.assign(slide, resolveSlide(slide, this.masters))
          delete slide.masterId; delete slide.layoutId
          slide.elements.forEach(el => { delete el.placeholderKey; delete el.placeholderDefaults })
        }
      }
      this.masters = this.masters.filter(m => m.id !== id)
      this.masters.forEach(m => { m.layouts = m.layouts.filter(l => l.id !== id) })
      this.masterEditingId = this.masters[0]?.id || ''
    },

    setTitle(title: string) {
      if (!title) this.title = '未命名演示文稿'
      else this.title = title
    },

    setTheme(themeProps: Partial<SlideTheme>) {
      this.theme = sanitizeData({ ...this.theme, ...themeProps })
    },
  
    setCanvasDimensions(width: number, height: number) {
      if (!validCanvasSize(width, height)) throw new Error('画布宽高需在 100–10000 之间')
      this.viewportSize = width
      this.viewportRatio = height / width
    },
    setViewportSize(size: number) {
      this.viewportSize = size
    },
  
    setViewportRatio(viewportRatio: number) {
      this.viewportRatio = viewportRatio
    },
  
    setSlides(slides: Slide[], themeProps?: Partial<SlideTheme>) {
      this.slides = sanitizeSlides(slides)
      this.syncMasterPlaceholders()
      if (themeProps) this.setTheme(themeProps)
    },
  

  
    addSlide(slide: Slide | Slide[]) {
      const slides = sanitizeSlides(Array.isArray(slide) ? slide : [slide])
      for (const slide of slides) {
        if (slide.sectionTag) delete slide.sectionTag
      }

      const addIndex = this.slideIndex + 1
      this.slides.splice(addIndex, 0, ...slides)
      this.slideIndex = addIndex
    },
  
    updateSlide(props: Partial<Slide>, slideId?: string) {
      const target = slideId ? this.slides.find(item => item.id === slideId) : this.currentSlide
      if (target) Object.assign(target, sanitizeData(props))
      if (this.masterEditingId) this.syncMasterPlaceholders()
    },
  
    removeSlideProps(data: RemovePropData) {
      const { id, propName } = data

      if (this.masterEditingId && this.currentSlide.id === id) {
        for (const name of (Array.isArray(propName) ? propName : [propName])) delete (this.currentSlide as unknown as Record<string, unknown>)[name]
        this.syncMasterPlaceholders()
        return
      }
      const slides = this.slides.map(slide => {
        return slide.id === id ? omit(slide, propName) : slide
      }) as Slide[]
      this.slides = sanitizeSlides(slides)
    },
  
    deleteSlide(slideId: string | string[]) {
      const slidesId = Array.isArray(slideId) ? slideId : [slideId]
      const slides: Slide[] = JSON.parse(JSON.stringify(this.slides))
  
      const deleteSlidesIndex = []
      for (const deletedId of slidesId) {
        const index = slides.findIndex(item => item.id === deletedId)
        deleteSlidesIndex.push(index)

        const deletedSlideSection = slides[index].sectionTag
        if (deletedSlideSection) {
          const handleSlideNext = slides[index + 1]
          if (handleSlideNext && !handleSlideNext.sectionTag) {
            delete slides[index].sectionTag
            slides[index + 1].sectionTag = deletedSlideSection
          }
        }

        slides.splice(index, 1)
      }
      let newIndex = Math.min(...deleteSlidesIndex)
  
      const maxIndex = slides.length - 1
      if (newIndex > maxIndex) newIndex = maxIndex
  
      this.slideIndex = newIndex
      this.slides = sanitizeSlides(slides)
    },
  
    updateSlideIndex(index: number) {
      this.slideIndex = index
    },
  
    addElement(element: PPTElement | PPTElement[]) {
      const elements = sanitizeData(Array.isArray(element) ? element : [element])
      const currentSlideEls = this.currentSlide.elements
      const newEls = [...currentSlideEls, ...elements]
      this.currentSlide.elements = newEls
      if (this.masterEditingId) this.syncMasterPlaceholders()
    },

    deleteElement(elementId: string | string[]) {
      const elementIdList = Array.isArray(elementId) ? elementId : [elementId]
      const currentSlideEls = this.currentSlide.elements
      if (this.masterEditingId && this.currentSlide.masterId) {
        const suppressed = currentSlideEls.filter(el => elementIdList.includes(el.id) && el.placeholderKey).map(el => el.placeholderKey!)
        this.currentSlide.suppressedPlaceholderKeys = [...new Set([...(this.currentSlide.suppressedPlaceholderKeys || []), ...suppressed])]
      }
      const newEls = currentSlideEls.filter(item => !elementIdList.includes(item.id))
      this.currentSlide.elements = newEls
      if (this.masterEditingId) this.syncMasterPlaceholders()
    },
  
    updateElement(data: UpdateElementData) {
      const { id, props, slideId } = data
      if (this.masterEditingId && 'content' in props && typeof props.content === 'string') {
        const size = props.content.match(/font-size:\s*([\d.]+)px/i)?.[1]
        if (size) Object.assign(props, { defaultFontSize: +size })
      }
      const elIdList = typeof id === 'string' ? [id] : id

      const slide = slideId ? this.slides.find(item => item.id === slideId) : this.currentSlide
      if (!slide) return
      slide.elements = slide.elements.map(el => elIdList.includes(el.id) ? { ...el, ...sanitizeData(props) } : el) as PPTElement[]
      if (this.masterEditingId) this.syncMasterPlaceholders()
    },
  
    removeElementProps(data: RemovePropData) {
      const { id, propName } = data
      const propsNames = typeof propName === 'string' ? [propName] : propName
  
      const slideIndex = this.slideIndex
      const slide = this.currentSlide
      const elements = slide.elements.map(el => {
        return el.id === id ? omit(el, propsNames) : el
      })
      this.currentSlide.elements = (elements as PPTElement[])
    },
  },
})