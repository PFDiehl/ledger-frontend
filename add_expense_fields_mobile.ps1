$file = "C:\Users\Paul\Desktop\ledger-app\app/(tabs)/index.tsx"
$content = Get-Content $file -Raw

$old = '            <Text style={{color:''#7A9A7A'',fontSize:11,marginBottom:6}}>DESCRIPTION</Text>
            <TextInput style={{backgroundColor:''#2D4A35'',borderRadius:10,padding:14,color:''#fff'',fontSize:15,marginBottom:16,borderWidth:1,borderColor:''#3D5A45''}} value={expenseForm.description} onChangeText={v=>setExpenseForm(f=>({...f,description:v}))} placeholder="Office supplies" placeholderTextColor="#7A9A7A" />
            <TouchableOpacity onPress={()=>{setShowExpense(false);setEditingExpense(false);}} style={{backgroundColor:''#3D5A45'',borderRadius:12,padding:16,alignItems:''center'',marginTop:8}}>
              <Text style={{color:''#A8D4A8'',fontSize:16,fontWeight:''600''}}>Cancel</Text>
            </TouchableOpacity>'

$new = '            <Text style={{color:''#7A9A7A'',fontSize:11,marginBottom:6}}>DATE</Text>
            <TextInput style={{backgroundColor:''#2D4A35'',borderRadius:10,padding:14,color:''#fff'',fontSize:15,marginBottom:16,borderWidth:1,borderColor:''#3D5A45''}} value={expenseForm.date} onChangeText={v=>setExpenseForm(f=>({...f,date:v}))} placeholder="YYYY-MM-DD" placeholderTextColor="#7A9A7A" />
            <Text style={{color:''#7A9A7A'',fontSize:11,marginBottom:6}}>PAYMENT METHOD</Text>
            <TouchableOpacity onPress={()=>setShowPaymentMethodPicker(true)} style={{backgroundColor:''#2D4A35'',borderRadius:10,padding:14,marginBottom:16,borderWidth:1,borderColor:''#3D5A45'',flexDirection:''row'',justifyContent:''space-between'',alignItems:''center''}}>
              <Text style={{color:expenseForm.paymentMethod?''#fff'':''#7A9A7A'',fontSize:15}}>{expenseForm.paymentMethod||''Select payment method...''}</Text>
              <Text style={{color:''#7A9A7A'',fontSize:12}}>▼</Text>
            </TouchableOpacity>
            <Modal visible={showPaymentMethodPicker} transparent animationType=''slide''>
              <TouchableOpacity style={{flex:1,backgroundColor:''rgba(0,0,0,0.5)''}} onPress={()=>setShowPaymentMethodPicker(false)} />
              <View style={{backgroundColor:''#1E3A28'',borderTopLeftRadius:20,borderTopRightRadius:20,padding:20,maxHeight:''60%''}}>
                <Text style={{color:''#A8D4A8'',fontSize:16,fontWeight:''700'',marginBottom:16,textAlign:''center''}}>Select Payment Method</Text>
                <ScrollView>
                  {[''Cash'',''Check'',''Credit Card'',''Debit Card'',''ACH / Bank Transfer'',''Wire Transfer'',''PayPal'',''Venmo'',''Zelle'',''Other''].map(pm=>(
                    <TouchableOpacity key={pm} onPress={()=>{setExpenseForm(f=>({...f,paymentMethod:pm}));setShowPaymentMethodPicker(false);}} style={{padding:14,borderBottomWidth:0.5,borderBottomColor:''#3D5A45'',backgroundColor:expenseForm.paymentMethod===pm?''#3D5A45'':''transparent'',borderRadius:8,marginBottom:2}}>
                      <Text style={{color:expenseForm.paymentMethod===pm?''#A8D4A8'':''#fff'',fontSize:15}}>{pm}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </Modal>
            <Text style={{color:''#7A9A7A'',fontSize:11,marginBottom:6}}>RECEIPT NUMBER</Text>
            <TextInput style={{backgroundColor:''#2D4A35'',borderRadius:10,padding:14,color:''#fff'',fontSize:15,marginBottom:16,borderWidth:1,borderColor:''#3D5A45''}} value={expenseForm.receiptNumber} onChangeText={v=>setExpenseForm(f=>({...f,receiptNumber:v}))} placeholder="REC-001 (optional)" placeholderTextColor="#7A9A7A" />
            <Text style={{color:''#7A9A7A'',fontSize:11,marginBottom:6}}>DESCRIPTION</Text>
            <TextInput style={{backgroundColor:''#2D4A35'',borderRadius:10,padding:14,color:''#fff'',fontSize:15,marginBottom:16,borderWidth:1,borderColor:''#3D5A45''}} value={expenseForm.description} onChangeText={v=>setExpenseForm(f=>({...f,description:v}))} placeholder="Office supplies" placeholderTextColor="#7A9A7A" />
            <TouchableOpacity onPress={()=>{setShowExpense(false);setEditingExpense(false);}} style={{backgroundColor:''#3D5A45'',borderRadius:12,padding:16,alignItems:''center'',marginTop:8}}>
              <Text style={{color:''#A8D4A8'',fontSize:16,fontWeight:''600''}}>Cancel</Text>
            </TouchableOpacity>'

$content.Replace($old, $new) | Set-Content $file
Write-Host "Done!"