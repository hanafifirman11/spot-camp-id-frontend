import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'currencyIdr',
  standalone: true
})
export class CurrencyIdrPipe implements PipeTransform {
  transform(value: number | string | null | undefined, fallback = 'Rp -'): string {
    if (value === null || value === undefined || value === '') {
      return fallback;
    }

    const parsed = Number(value);
    if (Number.isNaN(parsed)) {
      return fallback;
    }

    return `Rp ${parsed.toLocaleString('id-ID')}`;
  }
}
