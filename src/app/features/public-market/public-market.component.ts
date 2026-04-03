import { Component, OnInit, inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { NavbarComponent } from '../../layout/navbar.component';
import { InfiniteScrollModule } from 'ngx-infinite-scroll';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';

@Component({
  selector: 'app-public-market',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    RouterLink, 
    NavbarComponent, 
    InfiniteScrollModule,
    MatDatepickerModule,
    MatFormFieldModule
  ],
  templateUrl: './public-market.component.html',
  styleUrl: './public-market.component.scss'
})
export class PublicMarketComponent implements OnInit {
  searchQuery = '';
  checkIn: Date | null = null;
  checkOut: Date | null = null;
  loading = false;
  error = '';
  campsites: any[] = [];
  isSearchSticky = false;
  minDate = new Date();
  
  // Autocomplete
  suggestions: any[] = [];
  showSuggestions = false;
  
  // Pagination
  currentPage = 1;
  itemsPerPage = 6;
  hasMore = true;

  private http = inject(HttpClient);

  @HostListener('window:scroll', [])
  onWindowScroll() {
    // Munculkan sticky search setelah scroll melewati hero area (sekitar 400px)
    this.isSearchSticky = window.scrollY > 400;
  }

  ngOnInit() {
    this.loadCampsites();
  }

  onSearchInput() {
    if (this.searchQuery.length < 2) {
      this.suggestions = [];
      this.showSuggestions = false;
      return;
    }

    // Filter suggestions based on current campsites or hit a search endpoint
    // To be efficient, we use the current campsites list if available, 
    // or fetch from server
    const url = `/api/v1/public/campsites?q=${this.searchQuery}&_limit=5`;
    this.http.get<any[]>(url).subscribe(data => {
      this.suggestions = data;
      this.showSuggestions = data.length > 0;
    });
  }

  selectSuggestion(suggestion: any) {
    this.searchQuery = suggestion.name;
    this.showSuggestions = false;
    this.search(); // Execute search
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    // Hide suggestions when clicking outside
    this.showSuggestions = false;
  }

  loadCampsites(reset = false) {
    if (this.loading || (!this.hasMore && !reset)) return;
    
    this.loading = true;
    
    if (reset) {
      this.currentPage = 1;
      this.campsites = [];
      this.hasMore = true;
    }

    const url = `/api/v1/public/campsites?_page=${this.currentPage}&_limit=${this.itemsPerPage}`;
    
    this.http.get<any[]>(url).subscribe({
      next: (data) => {
        if (data.length < this.itemsPerPage) {
          this.hasMore = false;
        }
        this.campsites = [...this.campsites, ...data];
        this.currentPage++;
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to load campsites', err);
        this.error = 'Could not load campsites. Please try again later.';
        this.loading = false;
      }
    });
  }

  search() {
    // Validasi Tanggal
    if (this.checkIn && this.checkOut) {
      if (this.checkOut < this.checkIn) {
        alert('Check-out date cannot be earlier than Check-in date');
        return;
      }
    }

    // For search, we resets the list. 
    // Note: json-server supports 'q' parameter for full-text search
    if (this.loading) return;
    
    this.loading = true;
    this.currentPage = 1;
    this.campsites = [];
    this.hasMore = true;
    
    const url = `/api/v1/public/campsites?q=${this.searchQuery}&_page=${this.currentPage}&_limit=${this.itemsPerPage}`;
    
    this.http.get<any[]>(url).subscribe({
      next: (data) => {
        if (data.length < this.itemsPerPage) {
          this.hasMore = false;
        }
        this.campsites = data;
        this.currentPage++;
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Search failed.';
        this.loading = false;
      }
    });
  }

  onScroll() {
    this.loadCampsites();
  }

  getImageStyle(image?: string): string {
    const url = this.resolveImageUrl(image);
    return url ? `url("${encodeURI(url)}")` : 'none';
  }

  private resolveImageUrl(image?: string): string {
    if (!image) {
      return '';
    }
    if (image.startsWith('http://') || image.startsWith('https://')) {
      return image;
    }
    const normalized = image.replace(/^\/+/, '');
    if (normalized.startsWith('assets/')) {
      return `/${normalized}`;
    }
    if (normalized.startsWith('api/v1/')) {
      return `/${normalized}`;
    }
    return `/api/v1/${normalized}`;
  }

  getStayDuration(): string {
    if (!this.checkIn || !this.checkOut) return '';
    
    const diffTime = Math.abs(this.checkOut.getTime() - this.checkIn.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 0) return '';
    
    const nights = diffDays;
    const days = diffDays + 1;
    
    return `${days} Hari ${nights} Malam`;
  }
}
