import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NavbarComponent } from '../../layout/navbar.component';

interface QnaItem {
  id: string;
  category: string;
  question: string;
  answer: string;
  tags?: string[];
}

@Component({
  selector: 'app-qna',
  standalone: true,
  imports: [CommonModule, FormsModule, NavbarComponent],
  templateUrl: './qna.component.html',
  styleUrl: './qna.component.scss'
})
export class QnaComponent {
  query = '';
  activeCategory = 'All';

  readonly items: QnaItem[] = [
    {
      id: 'booking-1',
      category: 'Bookings',
      question: 'How do I book a campsite?',
      answer: 'Choose your dates, review the campsite details, then tap Book. You will see a price breakdown before confirming.',
      tags: ['checkout', 'availability']
    },
    {
      id: 'booking-2',
      category: 'Bookings',
      question: 'Can I change my booking dates?',
      answer: 'You can request a date change from your booking detail page. Approval depends on availability and the campsite policy.',
      tags: ['reschedule', 'policy']
    },
    {
      id: 'payments-1',
      category: 'Payments',
      question: 'What payment methods are supported?',
      answer: 'We support bank transfer, virtual account, and selected cards depending on your region.',
      tags: ['payment', 'checkout']
    },
    {
      id: 'payments-2',
      category: 'Payments',
      question: 'When will I receive a refund?',
      answer: 'Refund timing depends on your payment method. Most refunds are processed within 3-7 business days.',
      tags: ['refund']
    },
    {
      id: 'cancellation-1',
      category: 'Cancellations',
      question: 'What is the cancellation policy?',
      answer: 'Each campsite has its own policy. Check the Rules section on the campsite page before booking.',
      tags: ['policy', 'rules']
    },
    {
      id: 'merchant-1',
      category: 'Merchant',
      question: 'How do I publish a campsite map?',
      answer: 'Upload a background image, draw spots, bind each spot to a rental product, then Save & Publish.',
      tags: ['map', 'spot']
    },
    {
      id: 'merchant-2',
      category: 'Merchant',
      question: 'How do I add products for spots?',
      answer: 'Open Campsites > Products, create a rental product, then bind it to a spot in the map editor.',
      tags: ['product', 'spot']
    },
    {
      id: 'merchant-3',
      category: 'Merchant',
      question: 'Why is my map save button disabled?',
      answer: 'Ensure each spot has at least 3 points and is linked to a rental product. Resolve any map validation warnings.',
      tags: ['map', 'validation']
    },
    {
      id: 'account-1',
      category: 'Account',
      question: 'How do I update my profile?',
      answer: 'Go to Profile management and update your name, phone, or avatar. Changes are saved instantly.',
      tags: ['profile', 'settings']
    },
    {
      id: 'account-2',
      category: 'Account',
      question: 'I forgot my password, what should I do?',
      answer: 'Use the Forgot password link on the login page and follow the email instructions.',
      tags: ['password']
    },
    {
      id: 'pricing-1',
      category: 'Pricing',
      question: 'Can I set different prices for weekends?',
      answer: 'Yes, use pricing rules in the merchant console to set weekend or seasonal rates.',
      tags: ['pricing', 'merchant']
    },
    {
      id: 'support-1',
      category: 'Support',
      question: 'How do I contact support?',
      answer: 'Send a message via the in-app help center or email support@spotcamp.id.',
      tags: ['support']
    }
  ];

  get categories(): string[] {
    const unique = Array.from(new Set(this.items.map((item) => item.category)));
    return ['All', ...unique];
  }

  get filteredItems(): QnaItem[] {
    const query = this.query.trim().toLowerCase();
    return this.items.filter((item) => {
      const matchesCategory = this.activeCategory === 'All' || item.category === this.activeCategory;
      if (!matchesCategory) return false;
      if (!query) return true;
      const haystack = `${item.question} ${item.answer} ${(item.tags || []).join(' ')}`.toLowerCase();
      return haystack.includes(query);
    });
  }

  setCategory(category: string) {
    this.activeCategory = category;
  }

  clearSearch() {
    this.query = '';
  }

  trackById(_index: number, item: QnaItem) {
    return item.id;
  }
}
