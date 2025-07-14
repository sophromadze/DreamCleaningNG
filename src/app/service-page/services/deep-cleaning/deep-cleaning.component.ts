import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-deep-cleaning',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './deep-cleaning.component.html',
  styleUrl: './deep-cleaning.component.scss'
})
export class DeepCleaningComponent {
  constructor() {}
} 