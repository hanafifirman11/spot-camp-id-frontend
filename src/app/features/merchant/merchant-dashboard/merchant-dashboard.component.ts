import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CampsiteSummaryResponse, MerchantCampsiteService } from '../services/merchant-campsite.service';
import { StatCard } from '../models/merchant-dashboard.model';

@Component({
  selector: 'app-merchant-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './merchant-dashboard.component.html',
  styleUrl: './merchant-dashboard.component.scss'
})
export class MerchantDashboardComponent implements OnInit {
  private campsiteService = inject(MerchantCampsiteService);

  stats: StatCard[] = [
    { label: 'Active campsites', value: '0', hint: 'Sync your first listing' },
    { label: 'Upcoming bookings', value: '0', hint: 'No bookings yet' },
    { label: 'Monthly revenue', value: 'Rp 0', hint: 'Last 30 days' },
    { label: 'Occupancy rate', value: '0%', hint: 'Last 30 days' }
  ];

  ngOnInit() {
    this.campsiteService.getCampsiteSummary().subscribe({
      next: (summary) => this.applySummary(summary),
      error: () => {
        this.applySummary();
      }
    });
  }

  private applySummary(summary?: CampsiteSummaryResponse) {
    const active = summary?.active ?? 0;
    this.stats = [
      {
        label: 'Active campsites',
        value: String(active),
        hint: active > 0 ? 'Visible to campers' : 'Sync your first listing'
      },
      { label: 'Upcoming bookings', value: '0', hint: 'No bookings yet' },
      { label: 'Monthly revenue', value: 'Rp 0', hint: 'Last 30 days' },
      { label: 'Occupancy rate', value: '0%', hint: 'Last 30 days' }
    ];
  }
}
