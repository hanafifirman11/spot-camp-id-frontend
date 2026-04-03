import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-status-badge',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './status-badge.component.html',
  styleUrl: './status-badge.component.scss'
})
export class StatusBadgeComponent {
  @Input() status?: string | null;
  @Input() label?: string | null;
  @Input() size: 'sm' | 'md' = 'sm';

  get normalizedStatus(): string {
    return this.normalizeStatus(this.status);
  }

  get statusClass(): string {
    return `status-${this.normalizedStatus.toLowerCase()}`;
  }

  get sizeClass(): string {
    return `size-${this.size}`;
  }

  get displayLabel(): string {
    const inputLabel = this.label?.trim();
    if (inputLabel) {
      return inputLabel;
    }

    const normalized = this.normalizedStatus;
    if (!normalized) {
      return 'Unknown';
    }

    return normalized
      .split('_')
      .filter((part) => part.length > 0)
      .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
      .join(' ');
  }

  private normalizeStatus(value?: string | null): string {
    if (!value) {
      return 'UNKNOWN';
    }

    const normalized = value
      .trim()
      .replace(/\s+/g, '_')
      .replace(/[^A-Za-z0-9_]/g, '')
      .toUpperCase();

    return normalized || 'UNKNOWN';
  }
}
