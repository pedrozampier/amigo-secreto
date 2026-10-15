import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmCard, HlmCardContent, HlmCardDescription, HlmCardHeader, HlmCardTitle } from '@spartan-ng/helm/card';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, HlmButton, HlmCard, HlmCardHeader, HlmCardTitle, HlmCardDescription, HlmCardContent],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly titulo = signal('UTF-Secret');
}
