import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-move-in-out-cleaning',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './move-in-out-cleaning.component.html',
  styleUrl: './move-in-out-cleaning.component.scss'
})
export class MoveInOutCleaningComponent {
  constructor() {}
} 