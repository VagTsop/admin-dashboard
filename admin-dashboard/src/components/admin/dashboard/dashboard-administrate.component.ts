import { Component, ViewEncapsulation, OnInit, Input } from '@angular/core';
import { GenericComponent } from '../../../generic/generic.component';
import { fadeInAnimation } from '../../../utils/route-animation/route.animation';
import { sharedImports } from '../../../app/shared/shared';
import { amChartsComponents } from '../../../app/shared/amcharts';
import { DashboardService } from '../../../services/dashboard.service';
import { forkJoin, Observable } from 'rxjs';

@Component({
  selector: 'dashboard-administrate',
  standalone: true,
  imports: [...amChartsComponents, ...sharedImports],
  templateUrl: './dashboard-administrate-component.html',
  styleUrls: ['./dashboard-administrate-component.scss'],
  providers: [DashboardService],
  encapsulation: ViewEncapsulation.None,
  host: {
    '[@fadeInAnimation]': 'true',
  },
  animations: [fadeInAnimation],
})
export class DashboardAdministrateComponent
  extends GenericComponent
  implements OnInit
{
  @Input() isDark!: boolean;
  @Input() toggleTheme!: () => void;

  _showSpinner!: boolean;

  nodesDonutChartData$!: Observable<any>;
  beneficiariesDonutChartData$!: Observable<any>;
  usersDonutChartData$!: Observable<any>;
  conversationContractsDonutChartData$!: Observable<any>;
  collaborationsDonutChartData$!: Observable<any>;
  collaborationEnrollementsDonutChartData$!: Observable<any>;
  interfacesSparkLineData$!: Observable<any>;
  interactionsSparkLineData$!: Observable<any>;
  attestationsSparkLineData$!: Observable<any>;
  nodesBeneficiariesUsersClusteredColumnChartData$!: Observable<any>;
  beneficiariesClusteredColumnChartData$!: Observable<any>;
  groupsClusteredColumnChartData$!: Observable<any>;
  shipmentOrdersInboundStockChartData$!: Observable<any>;
  shipmentOrdersOutboundStockChartData$!: Observable<any>;
  messagesIncomingStockChartData$!: Observable<any>;
  messagesOutcomingStockChartData$!: Observable<any>;
  nodesBeneficiariesUsersLineGraphData$!: Observable<any>;
  deployedProcessesLineGraphData$!: Observable<any>;
  reportsLineGraphData$!: Observable<any>;
  userRegistrationLineGraphData$!: Observable<any>;
  paymentsLineGraphData$!: Observable<any>;
  assignedProcessesLineGraphData$!: Observable<any>;
  processInstancesLineGraphData$!: Observable<any>;

  subscriptionPoliciesPieChartData$!: Observable<any>;

  public tempNotShowDashboard = false;

  constructor(private dashBoardService: DashboardService) {
    super();
  }

  ngOnInit() {
    this.initializeObservables();

    forkJoin([
      this.nodesDonutChartData$,
      this.beneficiariesDonutChartData$,
      this.usersDonutChartData$,
    ]).subscribe(() => {
      this._showSpinner = false;
    });
  }

  initializeObservables() {
    this.nodesDonutChartData$ =
      this.dashBoardService.fetchNodesDonutChartData();
    this.beneficiariesDonutChartData$ =
      this.dashBoardService.fetchBeneficiariesDonutChartData();
    this.usersDonutChartData$ =
      this.dashBoardService.fetchUsersDonutChartData();
    this.conversationContractsDonutChartData$ =
      this.dashBoardService.fetchConversationContractsDonutChartData();
    this.collaborationsDonutChartData$ =
      this.dashBoardService.fetchCollaborationsDonutChartData();
    this.collaborationEnrollementsDonutChartData$ =
      this.dashBoardService.fetchCollaborationEnrollementsDonutChartData();
    this.interfacesSparkLineData$ = this.dashBoardService.fetchInterfaces();
    this.interactionsSparkLineData$ = this.dashBoardService.fetchInteractions();
    this.attestationsSparkLineData$ = this.dashBoardService.fetchAttestations();
    this.nodesBeneficiariesUsersClusteredColumnChartData$ =
      this.dashBoardService.fetchNodesBeneficiariesUsersClusteredColumnChartData();
    this.beneficiariesClusteredColumnChartData$ =
      this.dashBoardService.fetchBeneficiariesClusteredColumnChartData();
    this.groupsClusteredColumnChartData$ =
      this.dashBoardService.fetchGroupsClusteredColumnChartData();
    this.shipmentOrdersInboundStockChartData$ =
      this.dashBoardService.fetchShipmentOrdersInboundData();
    this.shipmentOrdersOutboundStockChartData$ =
      this.dashBoardService.fetchShipmentOrdersOutboundData();
    this.messagesIncomingStockChartData$ =
      this.dashBoardService.fetchMessagesIncomingStockChartData();
    this.messagesOutcomingStockChartData$ =
      this.dashBoardService.fetchMessagesOutcomingStockChartData();
    this.nodesBeneficiariesUsersLineGraphData$ =
      this.dashBoardService.fetchNodesBeneficiariesUsers();
    this.deployedProcessesLineGraphData$ =
      this.dashBoardService.fetchDeployedProcesses();
    this.reportsLineGraphData$ = this.dashBoardService.fetchReports();
    this.userRegistrationLineGraphData$ =
      this.dashBoardService.fetchUserRegistrationRequests();
    this.paymentsLineGraphData$ = this.dashBoardService.fetchPayments();
    this.assignedProcessesLineGraphData$ =
      this.dashBoardService.fetchAssignedProcesses();
    this.processInstancesLineGraphData$ =
      this.dashBoardService.fetchProcessInstances();
    this.subscriptionPoliciesPieChartData$ =
      this.dashBoardService.fetchSubscriptionPoliciesPieChartData();
  }

  onChangeSpinnerStatus() {
    this._showSpinner = false;
  }
}
