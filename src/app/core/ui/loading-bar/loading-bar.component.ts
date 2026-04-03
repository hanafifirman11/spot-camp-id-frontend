import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LoadingBarService } from './loading-bar.service';

@Component({
  selector: 'app-loading-bar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './loading-bar.component.html',
  styleUrl: './loading-bar.component.scss'
})
export class LoadingBarComponent {
  private loadingBar = inject(LoadingBarService);

  active$ = this.loadingBar.active$;
}
