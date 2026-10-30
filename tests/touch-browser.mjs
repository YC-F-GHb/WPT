import assert from 'node:assert/strict'
import { chromium, webkit } from 'playwright'
import { spawn } from 'node:child_process'

// Run after a production build. No production-only testing endpoints or hooks are added.
const url = process.env.WPT_TEST_URL || 'http://127.0.0.1:4173/'
let server
try {
  try { await fetch(url) }
  catch {
    server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', '4173', '--strictPort'], { stdio: 'inherit' })
    let ready = false
    for (let i = 0; i < 60; i++) {
      try { await fetch(url); ready = true; break } catch { await new Promise(r => setTimeout(r, 500)) }
    }
    assert.ok(ready, 'production preview must start')
  }
  const desktopUA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15'
  const ipadUA = 'Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'
  for (const [name, engine, mobile] of [['desktop mouse', chromium, false], ['iPad desktop website', webkit, false], ['iPad mobile website', webkit, true]]) {
    const browser = await engine.launch()
    try {
      const page = await browser.newPage({ viewport: { width: name === 'desktop mouse' ? 1440 : 1180, height: 900 }, hasTouch: name !== 'desktop mouse', userAgent: mobile ? ipadUA : desktopUA })
      if (name === 'iPad desktop website') await page.addInitScript(() => {
        Object.defineProperty(navigator, 'platform', { get: () => 'MacIntel' })
        Object.defineProperty(navigator, 'maxTouchPoints', { get: () => 5 })
      })
      await page.goto(url)
      await page.waitForFunction(() => document.querySelector('#app')?.__vue_app__?.config.globalProperties.$pinia?._s.has('slides'))
      if (mobile) await page.locator('.mobile-preview .menu-item').filter({ hasText: '编辑' }).click()
      await page.waitForSelector(mobile ? '.mobile-editor .content' : '.canvas')
      const tipTarget = page.locator(mobile ? '.mobile-editor-header .back' : '.canvas-tool .left-handler .handler-item').first()
      await tipTarget.hover()
      if (name === 'desktop mouse') {
        await page.locator('.tippy-box[data-theme~=tooltip]').waitFor({ state: 'visible' })
      }
      else {
        await page.waitForTimeout(700)
        assert.equal(await page.locator('.tippy-box[data-theme~=tooltip]').count(), 0, 'iPad must not show button tooltips')
        if (!mobile) assert.equal(await tipTarget.evaluate(el => Boolean(el._tippy)), false)
      }
      await page.mouse.move(1, 1)
      console.log(`PASS: ${name}: device-specific button tooltips`)
      await page.evaluate(() => {
        const stores = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s
        const canvas = document.createElement('canvas')
        canvas.width = 80; canvas.height = 80
        const ctx = canvas.getContext('2d')
        ctx.fillStyle = '#ee1122'; ctx.fillRect(0, 0, 80, 80)
        const imageSource = canvas.toDataURL('image/png')
        const slides = stores.get('slides')
        slides.setSlides([{ id: 'touch-slide', elements: [
          { id: 'touch-image', type: 'image', left: 100, top: 100, width: 220, height: 120, rotate: 0, fixedRatio: false,
            src: imageSource },
          { id: 'touch-text', type: 'text', left: 450, top: 100, width: 260, height: 100, rotate: 0, fixedHeight: true,
            defaultFontName: 'Arial', defaultColor: '#333333', content: '<p><span style="font-size:24px">建筑设计 Touch test</span></p>' },
        ] }])
        slides.updateSlideIndex(0)
      })
      const select = async id => {
        await page.evaluate(id => document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('main').setActiveElementIdList([id]), id)
        await page.waitForSelector('.operate-resize-handler.right-bottom')
      }
      const geometry = id => page.evaluate(id => {
        const s = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s
        const element = s.get('slides').currentSlide.elements.find(e => e.id === id)
        return { left: element.left, top: element.top, width: element.width, height: element.height }
      }, id)
      const scale = () => page.locator(mobile ? '.mobile-editor .viewport' : '.canvas .viewport').evaluate(el => Number(el.style.transform.match(/scale\(([^)]+)\)/)[1]))
      const near = (a, b) => assert.ok(Math.abs(a - b) < 0.02, `${name}: ${a} != ${b}`)
      const touchResize = async (id, dx, dy) => {
        await select(id)
        const before = await geometry(id), factor = await scale()
        const handle = page.locator('.operate-resize-handler.right-bottom')
        const box = await handle.boundingBox()
        await page.evaluate(({ box, dx, dy }) => {
          const x = box.x + box.width / 2, y = box.y + box.height / 2
          // Hit the invisible finger target, not just the 10px visible square.
          const target = document.elementFromPoint(x + 9, y + 9)
          if (!target?.classList.contains('resize-handler')) throw new Error('Resize hit area is covered by another control')
          const make = (x, y) => ({ identifier: 1, target, clientX: x, clientY: y, pageX: x, pageY: y })
          const fire = (element, type, touches, changedTouches) => {
            const event = new Event(type, { bubbles: true, cancelable: true })
            Object.defineProperties(event, { touches: { value: touches }, changedTouches: { value: changedTouches } })
            element.dispatchEvent(event)
          }
          const a = make(x + 9, y + 9), b = make(x + 9 + dx, y + 9 + dy)
          fire(target, 'touchstart', [a], [a])
          fire(document, 'touchmove', [b], [b])
          fire(document, 'touchend', [], [b])
        }, { box, dx, dy })
        const after = await geometry(id)
        near(after.width, before.width + dx / factor); near(after.height, before.height + dy / factor)
        near(after.left, before.left); near(after.top, before.top)
        assert.equal(await page.evaluate(() => document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('main').isScaling), false)
      }
      if (name === 'desktop mouse') {
        await select('touch-image')
        const before = await geometry('touch-image'), factor = await scale()
        const box = await page.locator('.operate-resize-handler.right-bottom').boundingBox()
        await page.mouse.move(box.x + 5, box.y + 5); await page.mouse.down()
        await page.mouse.move(box.x + 45, box.y + 25, { steps: 5 }); await page.mouse.up()
        const after = await geometry('touch-image')
        near(after.width, before.width + 40 / factor); near(after.height, before.height + 20 / factor)
      }
      else {
        await touchResize('touch-image', 43, 31)
        await touchResize('touch-text', 47, 29)
        await select('touch-image')
        const beforeImage = await geometry('touch-image'), beforeText = await geometry('touch-text'), beforeScale = await scale()
        const viewportBefore = await page.locator(mobile ? '.mobile-editor .viewport-wrapper' : '.canvas .viewport-wrapper').boundingBox()
        const center = await page.evaluate(mobile => {
          const surface = document.querySelector(mobile ? '.mobile-editor .content' : '.canvas')
          const target = surface.querySelector('.editable-element-image .element-content')
          const rect = target.getBoundingClientRect()
          const x = rect.left + rect.width / 2, y = rect.top + rect.height / 2
          const make = (id, clientX, clientY) => ({ identifier: id, target, clientX, clientY, pageX: clientX, pageY: clientY })
          const fire = (type, touches, changedTouches) => {
            const event = new Event(type, { bubbles: true, cancelable: true })
            Object.defineProperties(event, { touches: { value: touches }, changedTouches: { value: changedTouches } })
            target.dispatchEvent(event)
          }
          const a = make(11, x, y), b = make(12, x + 100, y)
          fire('touchstart', [a], [a])
          fire('touchstart', [a, b], [b])
          const c = make(11, x - 25, y + 20), d = make(12, x + 125, y + 20)
          fire('touchmove', [d, c], [c, d])
          fire('touchend', [c], [d])
          fire('touchmove', [make(11, x + 200, y + 200)], [c])
          fire('touchend', [], [c])
          return { x: x + 50, y }
        }, mobile)
        const afterScale = await scale()
        near(afterScale, beforeScale * 1.5)
        const viewportAfter = await page.locator(mobile ? '.mobile-editor .viewport-wrapper' : '.canvas .viewport-wrapper').boundingBox()
        near(viewportAfter.x + (center.x - viewportBefore.x) / beforeScale * afterScale, center.x)
        near(viewportAfter.y + (center.y - viewportBefore.y) / beforeScale * afterScale, center.y + 20)
        assert.deepEqual(await geometry('touch-image'), beforeImage)
        assert.deepEqual(await geometry('touch-text'), beforeText)
        if (!mobile) {
          const before = await page.evaluate(() => document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('main').canvasPercentage)
          await page.locator('.canvas').dispatchEvent('wheel', { deltaY: -100, ctrlKey: true, cancelable: true })
          near(await page.evaluate(() => document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('main').canvasPercentage), before + 5)
        }
      }
      // Crop touch handles must resize without moving the image itself.
      if (!mobile) {
        await select('touch-image')
        const before = await geometry('touch-image')
        await page.evaluate(() => document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('main').setClipingImageElementId('touch-image'))
        await page.waitForSelector('.image-clip-handler .clip-point.right-bottom')
        await page.evaluate(() => {
          const handle = document.querySelector('.image-clip-handler .clip-point.right-bottom')
          const box = handle.getBoundingClientRect()
          const x = box.x + box.width / 2, y = box.y + box.height / 2
          const target = document.elementFromPoint(x, y)
          if (!handle.contains(target)) throw new Error('Crop handle is covered')
          const fire = (el, type, touches) => {
            const e = new Event(type, { bubbles: true, cancelable: true })
            Object.defineProperties(e, { touches: { value: touches }, changedTouches: { value: touches } })
            el.dispatchEvent(e)
          }
          const point = (x, y) => ({ identifier: 77, target, pageX: x, pageY: y, clientX: x, clientY: y })
          fire(target, 'touchstart', [point(x, y)])
          fire(document, 'touchmove', [point(x - 30, y - 20)])
          fire(document, 'touchend', [])
        })
        await page.waitForFunction(() => parseFloat(document.querySelector('.image-clip-handler .operate').style.width) < 100)
        assert.deepEqual(await geometry('touch-image'), before)
        await page.locator('.canvas-tool').click({ position: { x: 2, y: 2 } })
        await page.waitForSelector('.image-clip-handler', { state: 'detached' })
        const after = await geometry('touch-image')
        assert.ok(after.width < before.width && after.height < before.height)
        near(after.left, before.left); near(after.top, before.top)
      }
      await select('touch-text')
      const trash = page.getByRole('button', { name: '删除选中元素', exact: true })
      await trash.waitFor({ state: 'visible' })
      const iconSizes = await trash.evaluate(el => ({
        trash: getComputedStyle(el).fontSize,
        peer: getComputedStyle(document.querySelector('.canvas-tool .handler-item, .mobile-editor-header .history-item')).fontSize,
      }))
      assert.equal(iconSizes.trash, iconSizes.peer, 'Trash must match adjacent toolbar icon size')
      await trash.click()
      await page.waitForFunction(() => !document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('slides').currentSlide.elements.some(e => e.id === 'touch-text'))
      assert.equal(await trash.count(), 0)
      assert.ok(await geometry('touch-image'))
      console.log(`PASS: ${name}: toolbar deletion${mobile ? '' : ', crop touch resize and commit'}`)
      if (!mobile) {
        await page.evaluate(() => {
          const stores = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s
          const slide = stores.get('slides').currentSlide
          stores.get('slides').setSlides([slide, { ...JSON.parse(JSON.stringify(slide)), id: 'second-pdf-slide' }])
          stores.get('main').setDialogForExport('pdf')
        })
        for (const [range, count] of [['全部', 2], ['当前页', 1]]) {
          await page.locator('.export-pdf-dialog button').filter({ hasText: new RegExp('^' + range + '$') }).click()
          const pending = page.waitForEvent('download', { timeout: 120000 })
          await page.locator('.export-pdf-dialog .export').click()
          const download = await pending
          assert.ok(download.suggestedFilename().endsWith('.pdf'))
          const stream = await download.createReadStream()
          const chunks = []
          for await (const chunk of stream) chunks.push(chunk)
          const pdf = Buffer.concat(chunks).toString('latin1')
          assert.ok(pdf.startsWith('%PDF-1.4'))
          assert.ok(pdf.includes('/Count ' + count + ' /Kids'))
          const dimensions = await page.evaluate(() => {
            const store = document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('slides')
            return [store.viewportSize * 0.75, store.viewportSize * store.viewportRatio * 0.75]
          })
          const boxes = [...pdf.matchAll(/\/MediaBox \[0 0 ([\d.]+) ([\d.]+)\]/g)]
          assert.equal(boxes.length, count)
          for (const box of boxes) { near(Number(box[1]), dimensions[0]); near(Number(box[2]), dimensions[1]) }
          assert.equal((pdf.match(/\/Subtype \/Image/g) || []).length, count)
          // Inspect the actual PDF image pixels; counting PDF image objects alone misses blank captures.
          const marker = pdf.indexOf('/Filter /DCTDecode')
          const start = pdf.indexOf('stream\n', marker) + 7
          const length = Number(pdf.slice(marker).match(/\/Length (\d+)/)[1])
          const jpeg = Buffer.concat(chunks).subarray(start, start + length).toString('base64')
          const pixel = await page.evaluate(async jpeg => {
            const image = new Image(); image.src = 'data:image/jpeg;base64,' + jpeg; await image.decode()
            const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height
            const ctx = canvas.getContext('2d'); ctx.drawImage(image, 0, 0)
            return Array.from(ctx.getImageData(260, 260, 1, 1).data)
          }, jpeg)
          assert.ok(pixel[0] > 180 && pixel[1] < 70 && pixel[2] < 90, `${name}: PDF must contain the red source image, got ${pixel}`)

          assert.equal((pdf.match(/\/Slide Do/g) || []).length, count)
          assert.equal(pdf.includes('/Annots'), false)
          assert.equal(pdf.includes('/Font'), false, 'PDF contains only slide images, no browser header/footer text')
          assert.equal(await page.locator('iframe[title="打印幻灯片"]').count(), 0)
        }
        await page.locator('.export-pdf-dialog .close').click()
        console.log(`PASS: ${name}: direct PDF downloads, all/current range, exact slide dimensions and full-bleed slide images`)
      }
      // Presentation letterboxing must stay black as the visible viewport changes.
      if (mobile) {
        await page.locator('.mobile-editor-header .back').click()
        await page.locator('.mobile-preview .menu-item').filter({ hasText: '播放' }).click()
      }
      else await page.evaluate(() => document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('screen').setScreening(true))
      const stage = mobile ? '.mobile-player' : '.wpt-screen'
      await page.waitForSelector(stage)
      const checkPresentation = async () => {
        await page.waitForFunction(stage => {
          const box = document.querySelector(stage).getBoundingClientRect()
          return Math.abs(box.width - (window.visualViewport?.width || window.innerWidth)) < 2 && Math.abs(box.height - (window.visualViewport?.height || window.innerHeight)) < 2
        }, stage)
        const result = await page.evaluate(stage => ({
          backgrounds: [document.documentElement, document.body, document.querySelector('#app'), document.querySelector(stage)].map(el => getComputedStyle(el).backgroundColor),
          slide: getComputedStyle(document.querySelector('.slide-item.current .slide-content')).backgroundColor,
          theme: document.querySelector('meta[name="theme-color"]').content,
          viewport: document.querySelector('meta[name="viewport"]').content,
        }), stage)
        assert.deepEqual(result.backgrounds, Array(4).fill('rgb(0, 0, 0)'))
        assert.equal(result.slide, 'rgb(255, 255, 255)', 'the slide itself must retain its white background')
        assert.equal(result.theme, '#000000')
        assert.match(result.viewport, /viewport-fit=cover/)
      }
      await checkPresentation()
      for (const viewport of [{ width: 1024, height: 700 }, { width: 820, height: 1180 }]) {
        await page.setViewportSize(viewport)
        await checkPresentation()
      }
      if (mobile) {
        await page.locator('.mobile-player .screen-slide-list').click({ position: { x: 20, y: 20 } })
        await page.locator('.mobile-player .back').click()
      }
      else await page.evaluate(() => document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('screen').setScreening(false))
      await page.waitForFunction(() => !document.documentElement.classList.contains('wpt-presenting'))
      assert.equal(await page.evaluate(() => getComputedStyle(document.body).backgroundColor), 'rgb(255, 255, 255)')
      console.log('PASS:', name, 'black presentation margins, viewport resize, original slide color and editor restoration')
      await page.close()
      console.log('PASS:', name, 'image/text control resizing, anchored two-finger zoom, gesture isolation and release')
    } finally { await browser.close() }
  }
} finally { server?.kill('SIGTERM') }
