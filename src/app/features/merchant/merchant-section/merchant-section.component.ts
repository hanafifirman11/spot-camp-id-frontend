import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-merchant-section',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './merchant-section.component.html',
  styleUrl: './merchant-section.component.scss'
})
export class MerchantSectionComponent {
  private route = inject(ActivatedRoute);

  get title(): string {
    return this.route.snapshot.data['title'] || 'Merchant Module';
  }

  get description(): string {
    return this.route.snapshot.data['description'] || 'Module setup is in progress.';
  }

  get ctaLabel(): string | null {
    return this.route.snapshot.data['ctaLabel'] || null;
  }
}
