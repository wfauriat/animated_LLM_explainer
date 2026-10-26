// The Scene 1 conversation, shared so later scenes can show it already finished.
import {Rect, Txt} from '@motion-canvas/2d';
import {bubbleText, ChatRefs, makeBubble} from './ChatApp';
import {colors} from '../theme';

export const USER_1 = 'Hello, who are you?';
export const USER_2 = 'Help me write a complaint letter to my noisy neighbour';
export const LETTER_WIDTH = 820;

export function bot1() {
  return [
    <Txt {...bubbleText}>
      I am your favorite conversational agent, or ‘chat-bot’.
    </Txt>,
    <Txt {...bubbleText}>What can I help you with?</Txt>,
  ];
}

export function Letter() {
  const placeholderLine = (width: `${number}%`) => (
    <Rect width={width} height={14} radius={7} fill={colors.bubbleText} opacity={0.18} />
  );
  return (
    <Rect direction={'column'} gap={12}>
      <Txt {...bubbleText}>Dear Mr X,</Txt>
      <Txt {...bubbleText}>
        After several reminders about the noise level, I am writing to you…
      </Txt>
      <Rect direction={'column'} gap={14} padding={[6, 0]}>
        {placeholderLine('100%')}
        {placeholderLine('92%')}
        {placeholderLine('60%')}
      </Rect>
      <Txt {...bubbleText}>Regards,</Txt>
    </Rect>
  );
}

// Adds the whole finished conversation at once.
export function showConversation(refs: ChatRefs) {
  const rows = [
    makeBubble('user', USER_1),
    makeBubble('bot', bot1()),
    makeBubble('user', USER_2),
    makeBubble('bot', <Letter />, LETTER_WIDTH),
  ];
  for (const {row, bubble} of rows) {
    bubble.opacity(1);
    bubble.scale(1);
    refs.messages().add(row);
  }
}
