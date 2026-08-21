
import { noStoreJson } from "../../../lib/api-response";
import { getSiteNoticeConfig } from "../../../lib/site-notice";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const notice = await getSiteNoticeConfig();
  return noStoreJson({ notice });
}
