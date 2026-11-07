import {Inbox} from "./inbox";
import {Conversation} from "./community";
import "./globals.css";
export const metadata={title:"Plot Twist · LBS ticket exchange",icons:{icon:"/favicon.svg"},description:"A student-to-student ticket exchange for London Business School."};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><head><link rel="stylesheet" href="/brand-marks.css"/></head><body>{children}<footer className="suggestFooter"><details><summary>Share a suggestion</summary><Conversation/></details></footer><Inbox/></body></html>}
