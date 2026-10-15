import { Component, input } from '@angular/core';

/**
 * ESQUELETO. O corpo (GRP-06, GRP-07, GRP-08) é implementado na plan 03-05.
 * O `token` chega como input() via withComponentInputBinding (D-09 / RA5-ID16).
 */
@Component({
  selector: 'app-join-group',
  imports: [],
  templateUrl: './join-group.page.html',
})
export class JoinGroupPage {
  readonly token = input.required<string>();
}
