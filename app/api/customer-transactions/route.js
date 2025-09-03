import connectDB from '@/lib/database';
import CustomerTransaction from '@/lib/models/CustomerTransaction';

// Migration function to convert old data format to new format
const migrateOldData = async () => {
  try {
    const oldTransactions = await CustomerTransaction.find({
      $or: [
        { totalAmount: { $exists: true } },
        { givenAmount: { $exists: true } },
        { remainingAmount: { $exists: true } },
        { unit: { $exists: true } },
        { item: { $exists: true } }
      ]
    });

    console.log(`Found ${oldTransactions.length} old format transactions to migrate`);

    for (const oldTransaction of oldTransactions) {
      // Convert old format to new format
      const newTransaction = {
        id: oldTransaction.id,
        customer: oldTransaction.customer,
        description: oldTransaction.description || 'Migrated transaction',
        date: oldTransaction.date,
        currency: oldTransaction.currency,
        debit: oldTransaction.givenAmount || 0,
        credit: oldTransaction.totalAmount || 0,
        balance: oldTransaction.remainingAmount || 0,
      };

      // Update the transaction
      await CustomerTransaction.findOneAndUpdate(
        { id: oldTransaction.id },
        newTransaction,
        { new: true, runValidators: true }
      );
    }

    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
  }
};

export async function GET() {
  try {
    await connectDB();
    
    // Run migration if needed
    await migrateOldData();
    
    const transactions = await CustomerTransaction.find({}).sort({ createdAt: -1 });
    
    // Ensure all transactions have the new fields with default values
    const processedTransactions = transactions.map(transaction => ({
      ...transaction.toObject(),
      debit: transaction.debit || 0,
      credit: transaction.credit || 0,
      balance: transaction.balance || 0
    }));
    
    return Response.json(processedTransactions);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    await connectDB();
    const data = await request.json();
    
    // Validate required fields
    if (!data.customer || !data.description || !data.date || !data.currency) {
      return Response.json({ error: 'Missing required fields: customer, description, date, currency' }, { status: 400 });
    }
    
    // Calculate balance based on previous transactions for the same customer
    const previousTransactions = await CustomerTransaction.find({ 
      customer: data.customer 
    }).sort({ createdAt: -1 });
    
    let currentBalance = 0;
    if (previousTransactions.length > 0) {
      currentBalance = previousTransactions[0].balance || 0;
    }
    
    // Calculate new balance: credit increases, debit decreases
    const newBalance = currentBalance + (data.credit || 0) - (data.debit || 0);
    
    const transaction = new CustomerTransaction({
      ...data,
      debit: data.debit || 0,
      credit: data.credit || 0,
      balance: newBalance
    });
    await transaction.save();
    
    return Response.json(transaction, { status: 201 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    await connectDB();
    const data = await request.json();
    
    // Validate required fields
    if (!data.customer || !data.description || !data.date || !data.currency) {
      return Response.json({ error: 'Missing required fields: customer, description, date, currency' }, { status: 400 });
    }
    
    // Get the transaction to be updated
    const existingTransaction = await CustomerTransaction.findOne({ id: data.id });
    if (!existingTransaction) {
      return Response.json({ error: 'Transaction not found' }, { status: 404 });
    }
    
    // Calculate the difference in amounts
    const oldCredit = existingTransaction.credit || 0;
    const oldDebit = existingTransaction.debit || 0;
    const newCredit = data.credit || 0;
    const newDebit = data.debit || 0;
    
    // Calculate balance adjustment
    const creditDifference = newCredit - oldCredit;
    const debitDifference = newDebit - oldDebit;
    const balanceAdjustment = creditDifference - debitDifference;
    
    // Update the current transaction
    const updatedTransaction = await CustomerTransaction.findOneAndUpdate(
      { id: data.id },
      { 
        ...data,
        debit: newDebit,
        credit: newCredit,
        balance: (existingTransaction.balance || 0) + balanceAdjustment 
      },
      { new: true, runValidators: true }
    );
    
    // Recalculate balances for all subsequent transactions for the same customer
    const subsequentTransactions = await CustomerTransaction.find({
      customer: data.customer,
      createdAt: { $gt: existingTransaction.createdAt }
    }).sort({ createdAt: 1 });
    
    let runningBalance = updatedTransaction.balance;
    for (const transaction of subsequentTransactions) {
      const transactionBalance = runningBalance + (transaction.credit || 0) - (transaction.debit || 0);
      await CustomerTransaction.findOneAndUpdate(
        { id: transaction.id },
        { balance: transactionBalance }
      );
      runningBalance = transactionBalance;
    }
    
    return Response.json(updatedTransaction);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    const transaction = await CustomerTransaction.findOne({ id });
    if (!transaction) {
      return Response.json({ error: 'Transaction not found' }, { status: 404 });
    }
    
    // Calculate the balance adjustment for deletion
    const balanceAdjustment = -(transaction.credit || 0) + (transaction.debit || 0);
    
    // Delete the transaction
    await CustomerTransaction.findOneAndDelete({ id });
    
    // Recalculate balances for all subsequent transactions for the same customer
    const subsequentTransactions = await CustomerTransaction.find({
      customer: transaction.customer,
      createdAt: { $gt: transaction.createdAt }
    }).sort({ createdAt: 1 });
    
    let runningBalance = (transaction.balance || 0) + balanceAdjustment;
    for (const subsequentTransaction of subsequentTransactions) {
      const transactionBalance = runningBalance + (subsequentTransaction.credit || 0) - (subsequentTransaction.debit || 0);
      await CustomerTransaction.findOneAndUpdate(
        { id: subsequentTransaction.id },
        { balance: transactionBalance }
      );
      runningBalance = transactionBalance;
    }
    
    return Response.json({ message: 'Transaction deleted successfully' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
} 