import { exit } from 'process'

/* If the environment variable is not set, exit the process. */
export const env = (name: string): string | null => {
  const value = process.env[name]
  if (!value) {
    console.error(`Environment variable missing: ${name}`)
    exit(0)
  }
  return value
}

export const setEnv = (name: string, value: string): void => {
  process.env[name] = value
}
