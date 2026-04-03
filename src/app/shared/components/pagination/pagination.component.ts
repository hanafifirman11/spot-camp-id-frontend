import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-pagination',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pagination.component.html',
  styleUrl: './pagination.component.scss'
})
export class PaginationComponent {
  @Input() pageNumber = 0;
  @Input() totalPages = 0;
  @Input() disabled = false;
  @Input() prevLabel = 'Previous';
  @Input() nextLabel = 'Next';
  @Input() containerClass = '';

  @Output() pageChange = new EventEmitter<number>();

  get hasPagination(): boolean {
    return this.totalPages > 1;
  }

  get prevDisabled(): boolean {
    return this.disabled || this.pageNumber <= 0;
  }

  get nextDisabled(): boolean {
    return this.disabled || this.pageNumber + 1 >= this.totalPages;
  }

  goPrev(): void {
    if (this.prevDisabled) {
      return;
    }
    this.pageChange.emit(this.pageNumber - 1);
  }

  goNext(): void {
    if (this.nextDisabled) {
      return;
    }
    this.pageChange.emit(this.pageNumber + 1);
  }
}
