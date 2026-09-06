'use client'

import { useApplicationDetailScope } from '../../../../../_study-work/state/ApplicationDetailScope'
import { ConversationThread } from '../../../../../_study-work/components/ConversationThread'

export default function ApplicationMessagesTab() {
  const { conversation, messages, sendMessage } = useApplicationDetailScope()
  return <ConversationThread conversation={conversation} messages={messages} onSend={sendMessage} />
}
