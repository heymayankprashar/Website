import {getChatGPTUser} from "../chatgpt-auth";
import {adminEmail} from "../../lib/student-access";
import Approvals from "./review";
export const dynamic="force-dynamic";
export default async function Page(){
 const reviewer=await getChatGPTUser();
 return <main><h1>Student approvals</h1>{reviewer?.email.toLowerCase()===adminEmail?<Approvals/>:<a className="primary" target="_top" href="/signin-with-chatgpt?return_to=/approve">Reviewer sign-in ↗</a>}</main>
}
