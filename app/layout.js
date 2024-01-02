import './globals.css'

export const viewport = {
    width: 'device-width',
    initialScale: 1,
    shrinkToFit: false,
}

export const metadata = {
    title: 'Taschenrechner',
    description: 'Simpler KEMDAS Taschenrechner für den DotSource SE Bewerbungsprozess',
}

export default function RootLayout({children}) {
    return (
        <html lang="de">
        <body style={{overflow: "hidden"}}>
        <link rel="preconnect" href="https://fonts.gstatic.com"/>
        <link href="https://fonts.googleapis.com/css2?family=Roboto+Mono:wght@400;700&display=swap"
              rel="stylesheet"/>
        <script async={true} src="https://kit.fontawesome.com/3c67b7e888.js" crossOrigin="anonymous"></script>
        {children}
        </body>
        </html>
    )
}
