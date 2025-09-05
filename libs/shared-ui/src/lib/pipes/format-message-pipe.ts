import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Pipe({
  name: 'formatMessage',
  standalone: true,
})
export class FormatMessagePipe implements PipeTransform {
  constructor(private sanitizer: DomSanitizer) {}

  transform(value: string): SafeHtml {
    if (!value) return '';

    // Convert newlines to <br> tags
    let formattedText = value.replace(/\n/g, '<br>');

    // Convert URLs to clickable links
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    formattedText = formattedText.replace(
      urlRegex,
      '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:underline">$1</a>'
    );

    // Convert **bold** text
    formattedText = formattedText.replace(
      /\*\*(.*?)\*\*/g,
      '<strong>$1</strong>'
    );

    // Convert *italic* text
    formattedText = formattedText.replace(/\*(.*?)\*/g, '<em>$1</em>');

    // Convert `code` text
    formattedText = formattedText.replace(
      /`(.*?)`/g,
      '<code class="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono">$1</code>'
    );

    // Convert code blocks ```code```
    formattedText = formattedText.replace(
      /```([\s\S]*?)```/g,
      '<pre class="bg-gray-100 p-3 rounded mt-2 mb-2 overflow-x-auto"><code class="text-sm">$1</code></pre>'
    );

    return this.sanitizer.bypassSecurityTrustHtml(formattedText);
  }
}
