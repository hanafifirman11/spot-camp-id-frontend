import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService, LogEntry } from '../services/admin.service';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';

@Component({
  selector: 'app-admin-logs',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-logs.component.html',
  styleUrl: './admin-logs.component.scss'
})
export class AdminLogsComponent implements OnInit {
  logs: LogEntry[] = [];
  isLoading = false;
  
  // Filters
  filterLevel = '';
  filterSearch = '';
  
  // Pagination
  page = 0;
  size = 50;
  hasMore = true; // Simple approach since we don't have total elements

  private searchSubject = new Subject<string>();
  private adminService = inject(AdminService);

  ngOnInit(): void {
    this.loadLogs();
    
    this.searchSubject.pipe(
      debounceTime(500),
      distinctUntilChanged()
    ).subscribe(term => {
      this.filterSearch = term;
      this.page = 0;
      this.loadLogs();
    });
  }

  onSearch(term: string): void {
    this.searchSubject.next(term);
  }

  onLevelChange(level: string): void {
    this.filterLevel = level;
    this.page = 0;
    this.loadLogs();
  }

  loadLogs(append: boolean = false): void {
    this.isLoading = true;
    this.adminService.getLogs({
      page: this.page,
      size: this.size,
      level: this.filterLevel,
      search: this.filterSearch
    }).subscribe({
      next: (response) => {
        if (append) {
          this.logs = [...this.logs, ...response.content];
        } else {
          this.logs = response.content;
        }
        
        // If we got less than requested, we likely hit the end (or start, technically)
        this.hasMore = response.content.length === this.size;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to load logs', err);
        this.isLoading = false;
      }
    });
  }

  loadMore(): void {
    this.page++;
    this.loadLogs(true);
  }

  getLevelClass(level: string): string {
    switch (level?.toUpperCase()) {
      case 'ERROR': return 'log-error';
      case 'WARN': return 'log-warn';
      case 'INFO': return 'log-info';
      case 'DEBUG': return 'log-debug';
      default: return '';
    }
  }
}
