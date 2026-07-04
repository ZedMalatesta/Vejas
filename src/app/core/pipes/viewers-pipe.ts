import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'viewers',
})
export class ViewersPipe implements PipeTransform {
  transform(value: string | number): string {
    const numericValue = typeof value === 'number' ? value : parseInt(value, 10);
    if (numericValue >= 1000000000) {
      return (numericValue / 1000000000).toFixed(1) + 'B' + ' viewers';
    }
    if (numericValue >= 1000000) {
      return (numericValue / 1000000).toFixed(1) + 'M' + ' viewers';
    }
    if (numericValue >= 1000) {
      return (numericValue / 1000).toFixed(1) + 'K' + ' viewers';
    }
    return numericValue === 1 ? '1 viewer' : value + ' viewers';
  }
}

