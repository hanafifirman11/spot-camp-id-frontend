import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { distinctUntilChanged, map } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class LoadingBarService {
  private pendingCount = new BehaviorSubject(0);

  readonly active$ = this.pendingCount.pipe(
    map((count) => count > 0),
    distinctUntilChanged()
  );

  start(): void {
    this.pendingCount.next(this.pendingCount.value + 1);
  }

  stop(): void {
    this.pendingCount.next(Math.max(0, this.pendingCount.value - 1));
  }
}
