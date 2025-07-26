import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map } from 'rxjs';

@Injectable()
export class DashboardService {
  constructor(private http: HttpClient) {}

  private fetchData(path: string) {
    return this.http.get<any>(`/assets/data/${path}.json`);
  }

  fetchNodesDonutChartData() {
    return this.fetchData('nodesDonutChartData');
  }

  fetchBeneficiariesDonutChartData() {
    return this.fetchData('beneficiariesDonutChartData');
  }

  fetchUsersDonutChartData() {
    return this.fetchData('usersDonutChartData');
  }

  fetchConversationContractsDonutChartData() {
    return this.fetchData('conversationContractsDonutChartData');
  }

  fetchCollaborationsDonutChartData() {
    return this.fetchData('collaborationsDonutChartData');
  }

  fetchCollaborationEnrollementsDonutChartData() {
    return this.fetchData('collaborationEnrollementsDonutChartData');
  }

  fetchNodesBeneficiariesUsersClusteredColumnChartData() {
    return this.fetchData('nodesBeneficiariesUsersClusteredColumnChartData');
  }

  fetchBeneficiariesClusteredColumnChartData() {
    return this.fetchData('beneficiariesClusteredColumnChartData');
  }

  fetchSubscriptionPoliciesPieChartData() {
    return this.fetchData('subscriptionPoliciesPieChartData');
  }

  fetchGroupsClusteredColumnChartData() {
    return this.fetchData('groupsClusteredColumnChartData');
  }

  fetchShipmentOrdersInboundData() {
    return this.fetchData('shipmentOrdersInboundStockChartData');
  }

  fetchShipmentOrdersOutboundData() {
    return this.fetchData('shipmentOrdersOutboundStockChartData');
  }

  fetchMessagesIncomingStockChartData() {
    return this.fetchData('messagesIncomingStockChartData');
  }

  fetchMessagesOutcomingStockChartData() {
    return this.fetchData('messagesOutcomingStockChartData');
  }

  fetchNodesBeneficiariesUsers() {
    return this.fetchData('nodesBeneficiariesUsersLineGraphChartData');
  }

  fetchDeployedProcesses() {
    return this.fetchData('deployedProcessesLineGraphChartData');
  }

  fetchReports() {
    return this.fetchData('reportsLineGraphChartData');
  }

  fetchPayments() {
    return this.fetchData('paymentsLineGraphChartData');
  }

  fetchAssignedProcesses() {
    return this.fetchData('assignedProcessesLineGraphChartData');
  }

  fetchProcessInstances() {
    return this.fetchData('processInstancesLineGraphChartData');
  }

  fetchUserRegistrationRequests() {
    return this.fetchData('userRegistrationRequestsLineGraphChartData');
  }

  fetchInterfaces() {
    return this.fetchData('interfacesSparkLineChartData');
  }

  fetchInteractions() {
    return this.fetchData('interactionsSparkLineChartData');
  }

  fetchAttestations() {
    return this.fetchData('attestationsSparkLineChartData');
  }
}
