// src/utils/moqiCode.ts
interface CharData {
  code: string // 编码
  shapes: string // 首末字形
  fullSplit: string // 完整拆分
}

class MoqiCodeMap {
  private charData = new Map<string, CharData>()
  private dataLoaded = false
  private loadingPromise: Promise<void> | null = null

  constructor() {
    this.loadingPromise = this.loadData()
  }

  private async loadData() {
    try {
      const response = await fetch('/moqi_chaifen_merged.txt')
      const content = await response.text()

      content.split(/\r?\n/).forEach((line) => {
        if (!line.trim()) return
        const [char, code, shapes, split] = line.split('\t')
        if (char && code && shapes && split) {
          this.charData.set(char, {
            code,
            shapes,
            fullSplit: split
          })
        }
      })
      this.dataLoaded = true
      console.log('Loaded moqi data:', this.charData)
    } catch (error) {
      console.error('Failed to load moqi data:', error)
    }
  }

  async ensureDataLoaded() {
    if (this.loadingPromise) {
      await this.loadingPromise
    }
  }

  getCode(char: string): string {
    if (!this.dataLoaded) {
      console.warn('Moqi data not loaded yet')
      return ''
    }
    const code = this.charData.get(char)?.code || ''
    // console.log(`Getting code for char: ${char}, code: ${code}`)
    return code
  }

  getShapes(char: string): string {
    if (!this.dataLoaded) {
      console.warn('Moqi data not loaded yet')
      return ''
    }
    return this.charData.get(char)?.shapes || ''
  }

  getFullSplit(char: string): string {
    if (!this.dataLoaded) {
      console.warn('Moqi data not loaded yet')
      return ''
    }
    return this.charData.get(char)?.fullSplit || ''
  }
}

const moqiCodeMap = new MoqiCodeMap()

export { moqiCodeMap } // 添加 export