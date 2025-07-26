import { Subscription } from 'rxjs';

export class GenericComponent {
  protected subscriptions: Subscription = new Subscription();
}
