import { Component, input } from '@angular/core';

/**
 * ESQUELETO. O corpo (GRP-04, GRP-05, WISH-01, WISH-02) é implementado na plan 03-05.
 * O `id` chega como input() via withComponentInputBinding (D-09 / RA5-ID16).
 */
@Component({
  selector: 'app-manage-group',
  imports: [],
  templateUrl: './manage-group.page.html',
})
export class ManageGroupPage {
  readonly id = input.required<string>();
}
