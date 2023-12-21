import './globals.css'

export const metadata = {
  title: 'Calculator Project',
  description: 'Simple Calculator for DotSource SE application process',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
    <body>{children}</body>
    </html>
  )
}
