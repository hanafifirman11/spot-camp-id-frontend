import { Injectable } from '@angular/core';
import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { LoadingBarService } from '../ui/loading-bar/loading-bar.service';

@Injectable()
export class LoadingBarInterceptor implements HttpInterceptor {
  constructor(private loadingBar: LoadingBarService) {}

  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    const method = req.method.toUpperCase();
    const isMutation = method === 'POST' || method === 'PUT' || method === 'PATCH' || method === 'DELETE';

    if (!isMutation) {
      return next.handle(req);
    }

    this.loadingBar.start();
    return next.handle(req).pipe(finalize(() => this.loadingBar.stop()));
  }
}
