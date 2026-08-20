import { Injectable, signal } from '@angular/core';

/**
 * The browser's own dictation, wrapped in signals.
 *
 * Nothing is recorded and nothing is uploaded by this app: SpeechRecognition is
 * the platform's, and the only thing that leaves it is the transcribed string —
 * which then travels the same path as anything typed into the box.
 *
 * Support is uneven (Chrome and Safari have it, Firefox does not), so `supported`
 * is checked before the button is rendered rather than after it is pressed.
 */
@Injectable({ providedIn: 'root' })
export class SpeechService {
  readonly listening = signal(false);

  private readonly Recognition =
    (globalThis as unknown as { SpeechRecognition?: SpeechRecognitionCtor })
      .SpeechRecognition ??
    (globalThis as unknown as { webkitSpeechRecognition?: SpeechRecognitionCtor })
      .webkitSpeechRecognition ??
    null;

  readonly supported = this.Recognition !== null;

  private session: SpeechRecognitionLike | null = null;

  /**
   * Listens until the speaker stops, then hands back what was heard.
   *
   * Resolves with an empty string when nothing was caught or the microphone was
   * refused — a failed dictation should do nothing, not raise an error at
   * someone who simply changed their mind.
   */
  listen(): Promise<string> {
    if (!this.Recognition || this.session) return Promise.resolve('');

    const session = new this.Recognition();
    session.lang = 'en-US';
    session.interimResults = false;
    session.maxAlternatives = 1;

    this.session = session;
    this.listening.set(true);

    return new Promise<string>((resolve) => {
      const finish = (text: string) => {
        this.session = null;
        this.listening.set(false);
        resolve(text);
      };

      session.onresult = (event) => finish(event.results[0]?.[0]?.transcript?.trim() ?? '');
      session.onerror = () => finish('');
      session.onend = () => {
        if (this.session === session) finish('');
      };

      session.start();
    });
  }

  stop(): void {
    this.session?.stop();
  }
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

/** Only the surface this service touches; the DOM lib does not declare it. */
interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: { results: { [index: number]: { [index: number]: { transcript: string } } } }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}
