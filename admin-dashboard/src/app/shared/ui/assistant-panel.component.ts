import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  effect,
  ElementRef,
  inject,
  Injector,
  viewChild,
} from '@angular/core';

import { AssistantService } from '../../core/services/assistant.service';
import { SpeechService } from '../../core/services/speech.service';
import { IconComponent } from './icon.component';

/**
 * Slide-over panel for the analyst. Deliberately a peer of the dashboard rather
 * than a modal: the charts stay visible, so when the assistant changes the
 * range you watch it happen.
 */
@Component({
  selector: 'app-assistant-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    @if (assistant.open()) {
      <div class="scrim" (click)="assistant.close()" aria-hidden="true"></div>
    }

    <aside
      class="panel"
      [class.is-open]="assistant.open()"
      role="complementary"
      aria-label="Analytics assistant"
      [attr.aria-hidden]="!assistant.open()"
    >
      <header>
        <span class="title">
          <app-icon name="bolt" [size]="14" [strokeWidth]="2" />
          Ask Atlas
        </span>
        <span class="mode" [attr.data-mode]="assistant.mode()">
          {{ assistant.mode() === 'gemini' ? 'Gemini' : 'offline demo' }}
        </span>
        <button type="button" class="icon-btn" (click)="assistant.clear()" title="Clear conversation">
          <app-icon name="dot" [size]="14" />
        </button>
        <button type="button" class="icon-btn" (click)="assistant.close()" aria-label="Close assistant">
          <app-icon name="x" [size]="14" />
        </button>
      </header>

      <div class="log" #log>
        @if (!assistant.messages().length) {
          <div class="empty">
            <p class="lede">Ask about the numbers on screen.</p>
            <p class="fine">
              Answers come from a digest of the current view — not the raw 50,000 rows, and
              never from outside it.
            </p>
          </div>
        }

        @for (m of assistant.messages(); track m.id) {
          <div class="msg" [attr.data-role]="m.role">
            @if (m.role === 'assistant') {
              <span class="avatar"><app-icon name="bolt" [size]="11" [strokeWidth]="2" /></span>
            }
            <div class="bubble">
              <!-- A reply can be a tool call with no prose; an empty paragraph
                   would read as a broken bubble, so the action line carries it. -->
              @if (m.text || m.streaming) {
                <p class="text">{{ plain(m.text) }}@if (m.streaming) {<span class="caret"></span>}</p>
              } @else if (!m.actions.length && !m.error) {
                <p class="text muted">No answer came back.</p>
              }

              @for (action of m.actions; track action) {
                <p class="action">
                  <app-icon name="trend" [size]="12" />
                  {{ action }}
                </p>
              }

              @if (m.error) {
                <p class="err">{{ m.error }}</p>
              }
            </div>
          </div>
        }
      </div>

      @if (!assistant.messages().length) {
        <div class="chips">
          @for (s of assistant.suggestions; track s) {
            <button type="button" (click)="assistant.ask(s)">{{ s }}</button>
          }
        </div>
      }

      <form class="composer" (submit)="submit($event)">
        <input
          #input
          type="text"
          placeholder="Ask about this data…"
          aria-label="Ask about this data"
          [disabled]="assistant.busy()"
        />
        @if (speech.supported) {
          <button
            type="button"
            class="send mic"
            [class.is-listening]="speech.listening()"
            [disabled]="assistant.busy()"
            (click)="dictate()"
            [attr.aria-pressed]="speech.listening()"
            [attr.aria-label]="speech.listening() ? 'Stop dictation' : 'Ask by voice'"
          >
            <app-icon name="mic" [size]="13" [strokeWidth]="2" />
          </button>
        }
        @if (assistant.busy()) {
          <button type="button" class="send stop" (click)="assistant.stop()" aria-label="Stop">
            <app-icon name="pause" [size]="13" [strokeWidth]="2" />
          </button>
        } @else {
          <button type="submit" class="send" aria-label="Send">
            <app-icon name="play" [size]="13" [strokeWidth]="2" />
          </button>
        }
      </form>
    </aside>
  `,
  styles: `
    :host {
      display: contents;
    }

    .scrim {
      position: fixed;
      inset: 0;
      z-index: 40;
      background: rgb(0 0 0 / 0.45);
      backdrop-filter: blur(2px);
      animation: fade var(--dur) var(--ease-out);
    }
    @keyframes fade {
      from { opacity: 0; }
    }

    .panel {
      position: fixed;
      top: 0;
      right: 0;
      z-index: 50;
      display: flex;
      flex-direction: column;
      width: min(420px, 100vw);
      height: 100dvh;
      background: var(--bg-elevated);
      border-left: 1px solid var(--border);
      transform: translateX(100%);
      transition: transform var(--dur-slow) var(--ease-out);
      will-change: transform;
    }
    .panel.is-open {
      transform: none;
      box-shadow: -24px 0 60px -30px rgb(0 0 0 / 0.9);
    }

    header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0 0.6rem 0 0.9rem;
      height: var(--shell-topbar);
      border-bottom: 1px solid var(--border);
      flex: none;
    }

    .title {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      font-size: var(--text-base);
      font-weight: 600;
    }

    .mode {
      margin-left: auto;
      padding: 0.1rem 0.4rem;
      border: 1px solid var(--border);
      border-radius: var(--radius-full);
      font-size: 0.6875rem;
      color: var(--text-dim, #7d8698);
    }
    .mode[data-mode='gemini'] {
      color: #7dd3fc;
      border-color: #0e7490;
    }

    .icon-btn {
      display: grid;
      place-items: center;
      width: 26px;
      height: 26px;
      border: 0;
      border-radius: var(--radius-sm);
      background: transparent;
      color: inherit;
      cursor: pointer;
    }
    .icon-btn:hover {
      background: var(--surface-hover);
    }

    .log {
      flex: 1;
      overflow-y: auto;
      padding: 0.9rem;
      display: flex;
      flex-direction: column;
      gap: 0.85rem;
    }

    .empty .lede {
      margin: 0 0 0.35rem;
      font-size: var(--text-base);
      font-weight: 600;
    }
    .empty .fine {
      margin: 0;
      font-size: var(--text-sm);
      line-height: 1.55;
      color: var(--text-dim, #7d8698);
    }

    .msg {
      display: flex;
      gap: 0.5rem;
      align-items: flex-start;
    }
    .msg[data-role='user'] {
      justify-content: flex-end;
    }

    .avatar {
      display: grid;
      place-items: center;
      flex: none;
      width: 22px;
      height: 22px;
      margin-top: 2px;
      border-radius: var(--radius-sm);
      background: linear-gradient(135deg, #0e7490, #22d3ee);
      color: #04121a;
    }

    .bubble {
      max-width: 88%;
      padding: 0.55rem 0.7rem;
      border: 1px solid var(--border);
      border-radius: var(--radius);
      background: var(--surface);
    }
    .msg[data-role='user'] .bubble {
      background: var(--surface-active);
    }

    .text {
      margin: 0;
      font-size: var(--text-sm);
      line-height: 1.6;
      white-space: pre-wrap;
    }

    .text.muted {
      color: var(--text-dim, #7d8698);
      font-style: italic;
    }

    .caret {
      display: inline-block;
      width: 6px;
      height: 12px;
      margin-left: 2px;
      vertical-align: -1px;
      background: currentColor;
      animation: blink 1s steps(2) infinite;
    }
    @keyframes blink {
      50% { opacity: 0; }
    }

    .action {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      margin: 0.5rem 0 0;
      padding-top: 0.45rem;
      border-top: 1px dashed var(--border);
      font-size: var(--text-xs);
      color: #7dd3fc;
    }

    .err {
      margin: 0.4rem 0 0;
      font-size: var(--text-xs);
      color: #f87171;
    }

    .chips {
      display: flex;
      flex-wrap: wrap;
      gap: 0.35rem;
      padding: 0 0.9rem 0.6rem;
      flex: none;
    }
    .chips button {
      padding: 0.3rem 0.55rem;
      border: 1px solid var(--border);
      border-radius: var(--radius-full);
      background: var(--surface);
      color: inherit;
      font: inherit;
      font-size: var(--text-xs);
      cursor: pointer;
      transition: background var(--dur-fast) var(--ease-out);
    }
    .chips button:hover {
      background: var(--surface-hover);
    }

    .composer {
      display: flex;
      gap: 0.4rem;
      padding: 0.7rem 0.9rem calc(0.7rem + env(safe-area-inset-bottom));
      border-top: 1px solid var(--border);
      flex: none;
    }
    .composer input {
      flex: 1;
      min-width: 0;
      height: 34px;
      padding: 0 0.6rem;
      border: 1px solid var(--border);
      border-radius: var(--radius);
      background: var(--surface);
      color: inherit;
      font: inherit;
      font-size: var(--text-sm);
    }
    .composer input:focus {
      outline: none;
      border-color: #0e7490;
    }

    .send {
      display: grid;
      place-items: center;
      width: 34px;
      height: 34px;
      border: 0;
      border-radius: var(--radius);
      background: #0e7490;
      color: #e0f7ff;
      cursor: pointer;
    }
    .send.stop {
      background: var(--surface-active);
      color: inherit;
    }

    .send.mic {
      background: var(--surface-active);
      color: inherit;
    }
    .send.mic:disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }
    .send.mic.is-listening {
      background: #b91c1c;
      color: #fee2e2;
      animation: pulse 1.4s ease-in-out infinite;
    }

    @keyframes pulse {
      50% {
        opacity: 0.62;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .panel { transition: none; }
      .caret { animation: none; }
      .send.mic.is-listening { animation: none; }
    }
  `,
})
export class AssistantPanelComponent {
  protected readonly assistant = inject(AssistantService);
  protected readonly speech = inject(SpeechService);
  private readonly injector = inject(Injector);

  private readonly log = viewChild<ElementRef<HTMLElement>>('log');
  private readonly input = viewChild<ElementRef<HTMLInputElement>>('input');

  constructor() {
    // Follow the stream: keep the newest text in view as it arrives.
    effect(() => {
      this.assistant.messages();
      afterNextRender(
        () => {
          const el = this.log()?.nativeElement;
          if (el) el.scrollTop = el.scrollHeight;
        },
        { injector: this.injector },
      );
    });

    effect(() => {
      if (!this.assistant.open()) return;
      afterNextRender(() => this.input()?.nativeElement.focus(), { injector: this.injector });
    });
  }

  /**
   * Models emit markdown even when asked not to, and the panel renders text
   * verbatim — so the markers are removed rather than interpreted. Stripping
   * beats rendering here: no parser, and no HTML injection surface.
   */
  protected plain(text: string): string {
    return text
      .replace(/\*\*(.+?)\*\*/g, '$1')
      .replace(/(^|\s)\*(?!\*)([^*]+?)\*(?=\s|$|[.,;:!?])/g, '$1$2')
      .replace(/`([^`]+?)`/g, '$1')
      .replace(/^#{1,6}\s+/gm, '');
  }

  /**
   * Dictation fills the box rather than sending: what the microphone heard is
   * shown for correction first, because "churn" and "turn" sound alike and a
   * question sent on a mishearing wastes a turn.
   */
  protected async dictate(): Promise<void> {
    if (this.speech.listening()) {
      this.speech.stop();
      return;
    }

    const heard = await this.speech.listen();
    const el = this.input()?.nativeElement;
    if (!el || !heard) return;

    el.value = heard;
    el.focus();
  }

  protected submit(event: Event): void {
    event.preventDefault();
    const el = this.input()?.nativeElement;
    if (!el?.value.trim()) return;
    const question = el.value;
    el.value = '';
    void this.assistant.ask(question);
  }
}
