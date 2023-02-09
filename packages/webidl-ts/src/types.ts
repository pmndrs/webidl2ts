export interface Options {
  /**
   * Whether fixes for emscripten should be applied
   * @default false
   */
  emscripten?: boolean

  /**
   * Whether to export the default module
   * @default false
   */
  defaultExport?: boolean

  /**
   * Name of the module
   * @default 'Module'
   */
  module?: string
}
