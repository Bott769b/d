import { Workspace } from "@/components/chat/Workspace";
import { DEFAULT_MODEL_ID, MODELS, isValidModel } from "@/lib/models";

// Re-evaluate per request so CAVOTI_DEFAULT_MODEL changes without redeploys.
export const dynamic = "force-dynamic";

export default function ChatPage(): React.JSX.Element {
  const envDefault = process.env.CAVOTI_DEFAULT_MODEL?.trim();
  const initialModelId =
    envDefault && isValidModel(envDefault) ? envDefault : DEFAULT_MODEL_ID;
  return <Workspace initialModels={MODELS} initialModelId={initialModelId} />;
}
