export const isObject = (value: unknown): value is Record<string, unknown> =>
  Object.prototype.toString.call(value) === '[object Object]'

export const isNotEmpty = <T>(value: T): value is NonNullable<T> =>
  value !== undefined && value !== null
