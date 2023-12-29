import './globals.css'

export const metadata = {
    title: 'Calculator Project',
    description: 'Simple Calculator for DotSource SE application process',
}

export default function RootLayout({children}) {
    return (
        <html lang="de">
        <body style={{overflow: "hidden"}}>
        <link rel="preconnect" href="https://fonts.gstatic.com"/>
        <link href="https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&display=swap" rel="stylesheet"/>
        <script async={true} src="https://kit.fontawesome.com/3c67b7e888.js" crossOrigin="anonymous"></script>
        {children}
        </body>
        </html>
    )
}