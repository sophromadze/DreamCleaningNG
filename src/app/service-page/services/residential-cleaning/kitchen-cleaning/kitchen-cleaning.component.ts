import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-kitchen-cleaning',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './kitchen-cleaning.component.html',
  styleUrl: './kitchen-cleaning.component.scss'
})
export class KitchenCleaningComponent {
  constructor() {}
} 